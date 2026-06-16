'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
        <FormField label="Họ tên" error={errors.name?.message} required>
          <Input {...register('name')} type="text" placeholder="Nguyễn Văn A" />
        </FormField>

        <FormField label="Email" error={errors.email?.message} required>
          <Input {...register('email')} type="email" placeholder="you@example.com" />
        </FormField>

        <FormField label="Mật khẩu" error={errors.password?.message} required>
          <Input {...register('password')} type="password" placeholder="Tối thiểu 8 ký tự" />
        </FormField>

        <FormField label="Xác nhận mật khẩu" error={errors.confirmPassword?.message} required>
          <Input {...register('confirmPassword')} type="password" placeholder="Nhập lại mật khẩu" />
        </FormField>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Đang đăng ký...' : 'Đăng ký'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-blue-500 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}
