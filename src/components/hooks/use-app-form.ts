import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

import { DateField } from "@/components/fields/date-field";
import { DocumentField } from "@/components/fields/document-field";
import { FormError } from "@/components/fields/form-error";
import { MoneyField } from "@/components/fields/money-field";
import { NumberField } from "@/components/fields/number-field";
import { PhoneField } from "@/components/fields/phone-field";
import { SelectField } from "@/components/fields/select-field";
import { SubmitButton } from "@/components/fields/submit-button";
import { TextField } from "@/components/fields/text-field";
import { TextareaField } from "@/components/fields/textarea-field";

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    DateField,
    DocumentField,
    MoneyField,
    NumberField,
    PhoneField,
    SelectField,
    TextField,
    TextareaField,
  },
  formComponents: {
    FormError,
    SubmitButton,
  },
});

export {
  fieldContext,
  formContext,
  useAppForm,
  useFieldContext,
  useFormContext,
};
