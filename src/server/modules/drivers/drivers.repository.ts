import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { Database, Transaction } from "@/server/db";
import {
  session as sessionTable,
  user as userTable,
} from "@/server/db/schemas/auth";
import { route, routeVersion, stopVersion } from "@/server/db/schemas/routes";
import { decrypt, encrypt } from "@/server/lib/crypto";
import type {
  DriverOutput,
  ListDriversInput,
  User,
  UserRole,
  UserWithDeletedAt,
} from "./drivers.types";

const ARCHIVE_BAN_REASON = "Conta arquivada";

export class DriversRepository {
  constructor(private readonly db: Database) {}

  private maskDocument(encrypted: string | null): string | null {
    if (!encrypted) return null;
    const decrypted = decrypt(encrypted);
    return `***.***.***-${decrypted.slice(-2)}`;
  }

  async create(input: {
    name: string;
    email: string;
    password: string;
    phone: string;
    document: string;
    role: UserRole;
  }) {
    const encryptedDocument = encrypt(input.document);

    const createdUser = await auth.api.createUser({
      body: {
        name: input.name,
        email: input.email.toLowerCase(),
        password: input.password,
      },
    });

    if (!createdUser.user) {
      throw new Error("Failed to create user via auth API");
    }

    const [row] = await this.db
      .update(userTable)
      .set({
        phone: input.phone,
        document: encryptedDocument,
        role: input.role,
      })
      .where(eq(userTable.id, createdUser.user.id))
      .returning();

    return row ? this.toDomainWithDecryptedDocument(row) : null;
  }

  async findById(id: User["id"]) {
    const [row] = await this.db
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .limit(1);
    return row ? this.toDomainWithDecryptedDocument(row) : null;
  }

  async findByIdIncludingDeleted(
    id: User["id"],
  ): Promise<UserWithDeletedAt | null> {
    const [row] = await this.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);
    return row ? this.toDomainWithDeletedAt(row) : null;
  }

  private toDomainWithDeletedAt(
    row: typeof userTable.$inferSelect,
  ): UserWithDeletedAt {
    return {
      ...row,
      document: row.document ? decrypt(row.document) : null,
      deletedAt: row.deletedAt,
    };
  }

  async findByEmail(email: string) {
    const [row] = await this.db
      .select()
      .from(userTable)
      .where(
        and(
          sql`lower(${userTable.email}) = ${email.toLowerCase()}`,
          isNull(userTable.deletedAt),
        ),
      )
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findByEmailIncludingDeleted(email: string) {
    const [row] = await this.db
      .select()
      .from(userTable)
      .where(sql`lower(${userTable.email}) = ${email.toLowerCase()}`)
      .limit(1);
    return row ? this.toDomainWithDeletedAt(row) : null;
  }

  async list(input: ListDriversInput, isAdmin = false) {
    const trimmedSearch = input.search?.trim();
    const allowedRoles: UserRole[] = isAdmin
      ? ["driver", "manager", "admin"]
      : ["driver"];
    const roleFilter =
      input.role && allowedRoles.includes(input.role)
        ? (input.role as UserRole)
        : undefined;
    const where = and(
      input.includeDeleted ? undefined : isNull(userTable.deletedAt),
      roleFilter
        ? eq(userTable.role, roleFilter)
        : inArray(userTable.role, [...allowedRoles]),
      trimmedSearch
        ? or(
            ilike(userTable.name, `%${trimmedSearch}%`),
            ilike(userTable.email, `%${trimmedSearch}%`),
          )
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(userTable)
        .where(where)
        .orderBy(desc(userTable.createdAt))
        .limit(input.limit)
        .offset(input.offset),
      this.db.select({ total: count() }).from(userTable).where(where),
    ]);

    return {
      drivers: rows.map((row) => this.toDomainWithDecryptedDocument(row)),
      total,
    };
  }

  async update(
    id: User["id"],
    input: Partial<Pick<User, "name" | "phone" | "document">>,
  ) {
    const updates: Record<string, unknown> = {};
    if (input.name) updates.name = input.name;
    if (input.phone) updates.phone = input.phone;
    if (input.document) updates.document = encrypt(input.document);
    if (Object.keys(updates).length === 0) return null;

    updates.updatedAt = new Date();

    const [row] = await this.db
      .update(userTable)
      .set(updates)
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .returning();
    return row ? this.toDomainWithDecryptedDocument(row) : null;
  }

  async hasRouteHistory(id: User["id"]) {
    const [routeRef] = await this.db
      .select({ id: route.id })
      .from(route)
      .where(or(eq(route.driverId, id), eq(route.managerId, id)))
      .limit(1);
    if (routeRef) return true;

    const [versionRef] = await this.db
      .select({ id: routeVersion.id })
      .from(routeVersion)
      .where(or(eq(routeVersion.driverId, id), eq(routeVersion.managerId, id)))
      .limit(1);
    if (versionRef) return true;

    const [actorRef] = await this.db
      .select({ id: stopVersion.id })
      .from(stopVersion)
      .where(eq(stopVersion.actorId, id))
      .limit(1);
    return !!actorRef;
  }

  async archive(id: User["id"]) {
    const [row] = await this.db.transaction(async (tx: Transaction) => {
      await tx.delete(sessionTable).where(eq(sessionTable.userId, id));

      return tx
        .update(userTable)
        .set({
          deletedAt: new Date(),
          banned: true,
          banReason: ARCHIVE_BAN_REASON,
          updatedAt: new Date(),
        })
        .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
        .returning();
    });
    return row ? this.toDomain(row) : null;
  }

  async hardDelete(id: User["id"]) {
    const [row] = await this.db
      .delete(userTable)
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  async restore(id: User["id"]) {
    const [row] = await this.db
      .update(userTable)
      .set({
        deletedAt: null,
        banned: false,
        banReason: null,
        updatedAt: new Date(),
      })
      .where(and(eq(userTable.id, id), isNotNull(userTable.deletedAt)))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: typeof userTable.$inferSelect): User {
    return {
      ...row,
      document: row.document,
    };
  }

  private toDomainWithDecryptedDocument(
    row: typeof userTable.$inferSelect,
  ): DriverOutput {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      document: this.maskDocument(row.document),
      role: row.role,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
