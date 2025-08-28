import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { UseFormReturn } from 'react-hook-form'
import type { CardPackageState } from '../../types'

interface MetadataTabProps {
  form: UseFormReturn<CardPackageState>
}

export function MetadataTab({ form }: MetadataTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>卡包基础信息</CardTitle>
        <CardDescription>
          设置卡包的名称、版本、描述等基础信息
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>卡包名称 *</FormLabel>
                <FormControl>
                  <Input placeholder="请输入卡包名称" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>版本号 *</FormLabel>
                <FormControl>
                  <Input placeholder="例如: 1.0.0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>作者信息</FormLabel>
              <FormControl>
                <Input placeholder="请输入作者信息" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>卡包描述</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="请输入卡包描述"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                简要描述这个卡包的内容和特色
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}