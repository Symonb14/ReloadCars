'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/fetcher'
import {
  getAdminListPartnersQueryKey,
  useAdminCreatePartner,
  useAdminUpdatePartner,
} from '@/api/generated/admin/admin'
import type { AdminListPartners200PartnersItem } from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCnpj, formatPhone, maskCnpj, maskPhone } from '@/lib/format'

const partnerFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do parceiro.'),
  document: z.string().trim(),
  email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  phone: z
    .string()
    .refine(
      (value) =>
        value.replace(/\D/g, '').length === 0 || value.replace(/\D/g, '').length >= 10,
      'Telefone com DDD.',
    ),
})

type PartnerForm = z.infer<typeof partnerFormSchema>

type PartnerFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner?: AdminListPartners200PartnersItem | null
}

export function PartnerFormDialog({
  open,
  onOpenChange,
  partner,
}: PartnerFormDialogProps) {
  const queryClient = useQueryClient()
  const createPartner = useAdminCreatePartner()
  const updatePartner = useAdminUpdatePartner()
  const isEditing = Boolean(partner)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PartnerForm>({ resolver: zodResolver(partnerFormSchema) })

  useEffect(() => {
    if (!open) return
    reset({
      name: partner?.name ?? '',
      document: partner?.document ? formatCnpj(partner.document) : '',
      email: partner?.email ?? '',
      phone: partner?.phone ? formatPhone(partner.phone) : '',
    })
  }, [open, partner, reset])

  async function onSubmit(form: PartnerForm) {
    const data = {
      name: form.name,
      document: form.document || null,
      email: form.email || null,
      phone: form.phone || null,
    }

    try {
      if (partner) {
        await updatePartner.mutateAsync({ id: partner.id, data })
      } else {
        await createPartner.mutateAsync({ data })
      }
      await queryClient.invalidateQueries({ queryKey: getAdminListPartnersQueryKey() })
      toast.success(isEditing ? 'Parceiro atualizado.' : 'Parceiro criado.')
      onOpenChange(false)
    } catch (error) {
      // The API validates the CNPJ check digits; show its answer on the field.
      if (error instanceof ApiError && error.status === 400) {
        setError('document', { message: 'Confira o CNPJ (dígitos verificadores).' })
        return
      }
      toast.error('Não foi possível salvar o parceiro.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar parceiro' : 'Novo parceiro'}</DialogTitle>
          <DialogDescription>
            Estabelecimento com pontos de recarga divulgados no app.
          </DialogDescription>
        </DialogHeader>

        <form id="partner-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <Field label="Nome" id="name" error={errors.name?.message}>
            <Input id="name" autoFocus {...register('name')} />
          </Field>
          <Field
            label="CNPJ (opcional)"
            id="document"
            error={errors.document?.message}
            hint="Aceita o formato numérico e o alfanumérico (2026)."
          >
            <Input
              id="document"
              placeholder="00.000.000/0000-00"
              autoCapitalize="characters"
              maxLength={18}
              {...withMask(register('document'), maskCnpj)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail (opcional)" id="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} />
            </Field>
            <Field label="Telefone (opcional)" id="phone" error={errors.phone?.message}>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="(31) 99999-0000"
                maxLength={15}
                {...withMask(register('phone'), maskPhone)}
              />
            </Field>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="partner-form" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Applies an input mask before react-hook-form stores the typed value. */
function withMask<
  T extends { onChange: (event: React.ChangeEvent<HTMLInputElement>) => unknown },
>(field: T, mask: (value: string) => string) {
  return {
    ...field,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      event.target.value = mask(event.target.value)
      return field.onChange(event)
    },
  }
}

function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string
  id: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
