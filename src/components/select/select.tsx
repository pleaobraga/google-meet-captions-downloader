import {
  Select as BaseSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

type SelectProps = React.ComponentProps<typeof BaseSelect> & {
  label: string
  options: Array<{ value: string; label: string }>
  emptyOption?: string
}

export function Select({ label, options, emptyOption, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-3 items-start">
      <label>{label}</label>
      <BaseSelect {...props}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={emptyOption ?? label} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </BaseSelect>
    </div>
  )
}
