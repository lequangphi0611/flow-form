'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/FormField'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
})

type LoginInput = z.infer<typeof loginSchema>

interface LoginFormProps {
  isPending: boolean
  error: string | null
  onSubmit: (email: string, password: string) => void
}

export function LoginForm({ isPending, error, onSubmit }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  function handleFormSubmit(data: LoginInput) {
    onSubmit(data.email, data.password)
  }

  return (
    <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Đăng nhập</h1>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField label="Email" error={errors.email?.message} required>
          <Input {...register('email')} type="email" placeholder="you@example.com" />
        </FormField>

        <FormField label="Mật khẩu" error={errors.password?.message} required>
          <Input {...register('password')} type="password" placeholder="Mật khẩu của bạn" />
        </FormField>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-blue-500 hover:underline">
          Đăng ký
        </Link>
      </p>
    </div>
  )
}
