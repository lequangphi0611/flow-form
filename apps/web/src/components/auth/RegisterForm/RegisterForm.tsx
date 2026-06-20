'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/FormField'

const registerSchema = z
  .object({
    name: z.string().min(1, 'Họ tên không được để trống'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

type RegisterInput = z.infer<typeof registerSchema>

interface RegisterFormProps {
  isPending: boolean
  emailError?: string
  onSubmit: (data: { name: string; email: string; password: string }) => void
}

export function RegisterForm({ isPending, emailError, onSubmit }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (emailError) {
      setError('email', { message: emailError })
    } else {
      clearErrors('email')
    }
  }, [emailError, setError, clearErrors])

  function handleFormSubmit(data: RegisterInput) {
    onSubmit({ name: data.name, email: data.email, password: data.password })
  }

  return (
    <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Đăng ký</h1>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField label="Họ tên" name="name" error={errors.name?.message} required>
          <Input
            {...register('name')}
            id="name"
            type="text"
            placeholder="Nguyễn Văn A"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
        </FormField>

        <FormField label="Email" name="email" error={errors.email?.message} required>
          <Input
            {...register('email')}
            id="email"
            type="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </FormField>

        <FormField label="Mật khẩu" name="password" error={errors.password?.message} required>
          <Input
            {...register('password')}
            id="password"
            type="password"
            placeholder="Tối thiểu 8 ký tự"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
        </FormField>

        <FormField label="Xác nhận mật khẩu" name="confirmPassword" error={errors.confirmPassword?.message} required>
          <Input
            {...register('confirmPassword')}
            id="confirmPassword"
            type="password"
            placeholder="Nhập lại mật khẩu"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
        </FormField>

        <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Đang đăng ký...' : 'Đăng ký'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}
