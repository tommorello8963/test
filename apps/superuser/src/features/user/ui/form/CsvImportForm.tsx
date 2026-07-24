import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  Form,
  FormButtons,
  FormLabel,
  FormSection,
  UploadFileField,
} from '@lms/ui/form-kit'

import { Card } from '@lms/ui/components/card'
import { createColumnHelper } from '@tanstack/react-table'
import { toast } from 'sonner'

import { Text } from '@lms/ui/components/text'

import { PageLayout } from '@lms/ui/shared/layout/PageLayout'
import { usePagination } from '@lms/ui/hooks/use-pagination'
import { PaginatedDataTable } from '@lms/ui/shared/PaginatedDataTable'
import { CheckCircle, FileText, TriangleAlert } from 'lucide-react'
import { CsvStataticsCard } from '../CsvStaticsCard'
import type { ColumnDef } from '@lms/ui/components/data-table'
import type { UserCSVDataSchema } from '@/features/user/model/user.csv.schema.ts'
import { zUserCSVDataSchema } from '@/features/user/model/user.csv.schema.ts'
import { PreviewTableRow } from '@/features/user/ui/PreviewTableRow.tsx'
import { BREADCRUMBS } from '@/constants/breadcrumb'
import { getPageData } from '@/shared/utils/helpers'
import { useImportUsersCsvMutation } from '@/features/user/api/user.mutations.ts'
import { showImportResultToast } from '@/shared/utils/csv-import.helpers.ts'

interface PreviewDataTableRow extends UserCSVDataSchema {
  id?: string
  errors?: unknown
}

export function CsvImportForm() {
  const form = useForm()
  const { watch } = form
  const csvData = watch('csv', { data: [], file: null })
  const navigate = useNavigate()
  const router = useRouter()
  const columnHelpers = createColumnHelper<UserCSVDataSchema>()
  const { mutateAsync: importUsers, isPending } = useImportUsersCsvMutation({
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const { page, pageSize, setPage } = usePagination()

  function createPreviewColumn(
    field: keyof UserCSVDataSchema,
    header: string,
  ): ColumnDef<PreviewDataTableRow, string> {
    return {
      accessorKey: field,
      header,
      cell: ({ row }) => (
        <PreviewTableRow
          row={row}
          field={field}
        />
      ),
    }
  }

  const columns: Array<ColumnDef<UserCSVDataSchema, string>> = [
    columnHelpers.display({
      id: 'sn',
      header: '#',
      cell: ({ row }) => <Text>{row.index + 1}</Text>,
    }),
    createPreviewColumn('contractCode', '契約先コード'),
    createPreviewColumn('companyCode', '企業コード'),
    createPreviewColumn('branchCode', '支店コード'),
    createPreviewColumn('companyName', '企業名(漢字)'),
    createPreviewColumn('employeeNumber', '従業員番号'),
    createPreviewColumn('membershipNo', '会員№'),
    createPreviewColumn('memberNameKanji', '会員氏名(漢字)'),
    createPreviewColumn('memberNameKana', '会員氏名(カナ)'),
    createPreviewColumn('memberDateOfBirth', ' 会員生年月日'),
    createPreviewColumn('email', 'PCメールアドレス'),
    createPreviewColumn('contractType', '雇用形態'),
    createPreviewColumn('department', '部署'),
    createPreviewColumn('position', '役職'),
    createPreviewColumn('group', 'グループ'),
    createPreviewColumn(
      'loginNotificationDeliveryDate',
      '初回ログインメール配信日',
    ),
  ] as const

  const mapCSVHeader = useMemo(
    () => ({
      '会員№': 'membershipNo',
      契約先コード: 'contractCode',
      企業コード: 'companyCode',
      支店コード: 'branchCode',
      '企業名(漢字)': 'companyName',
      従業員番号: 'employeeNumber',
      '会員氏名(漢字)': 'memberNameKanji',
      '会員氏名(カナ)': 'memberNameKana',
      会員生年月日: 'memberDateOfBirth',
      PCメールアドレス: 'email',
      雇用形態: 'contractType',
      部署: 'department',
      役職: 'position',
      グループ: 'group',
      初回ログインメール配信日: 'loginNotificationDeliveryDate',
    }),
    [],
  )

  const handleSubmit = async () => {
    if (!csvData?.file) {
      toast.error('CSVファイルを選択してください。')
      return
    }

    const result = await importUsers({ file: csvData.file })

    if (showImportResultToast(result, toast)) {
      void navigate({
        to: '/user/list',
      })
    }
  }
  const handleCancel = () => {
    router.history.back()
  }
  const handleCsvDataValidation = (): Array<PreviewDataTableRow> => {
    const results: Array<PreviewDataTableRow> = []
    csvData?.data?.forEach((row: PreviewDataTableRow) => {
      const normalizedRow = {
        ...row,
        contractType:
          row.contractType === '非正規社員' ? '非正規' : row.contractType,
      }
      const validatedData = zUserCSVDataSchema.safeParse(normalizedRow)
      if (!validatedData.success) {
        const formatedError = z.flattenError(validatedData.error)
        const firstFieldErrors = Object.fromEntries(
          Object.entries(formatedError.fieldErrors).map(([key, errors]) => [
            key,
            errors.slice(0, 1),
          ]),
        )

        const newError = {
          ...formatedError,
          fieldErrors: firstFieldErrors,
        }
        results.push({
          ...normalizedRow,
          id: normalizedRow.employeeNumber,
          errors: newError,
        })
      } else {
        results.push({ ...normalizedRow, id: normalizedRow.employeeNumber })
      }
    })
    return results
  }

  const errorCount = handleCsvDataValidation().filter((row) =>
    Object.hasOwn(row, 'errors'),
  ).length

  const validCount = handleCsvDataValidation().filter(
    (row) => !Object.hasOwn(row, 'errors'),
  ).length

  const validatedData = handleCsvDataValidation()

  return (
    <>
      <PageLayout
        breadcrumbs={[
          {
            label: BREADCRUMBS.HOME,
            href: '/',
          },
          {
            label: BREADCRUMBS.USER,
            href: '/user/list',
          },
          { label: BREADCRUMBS.DETAIL },
        ]}
        breadCrumbLink={Link}
        header={<Text variant="heading">ユーザーCSV追加</Text>}
        headerContent={
          <>
            <FormButtons
              isSubmitting={isPending}
              onCancel={handleCancel}
              form="user-bulk-csv-upload-form"
              submitText="保存"
              cancelText="一覧へ戻る"
              submitButtonProps={{
                variant: 'brand',
                className: 'min-w-[120px]',
                loading: isPending,
                disabled:
                  errorCount > 0 || !csvData?.data?.length || !csvData?.file,
              }}
            />
          </>
        }
      >
        <Form
          form={form}
          onSubmit={handleSubmit}
          className="space-y-3"
          id="user-bulk-csv-upload-form"
        >
          <FormSection className="overflow-hidden rounded-lg shadow-xs border border-slate-100 bg-white p-4 sm:p-6">
            <FormLabel required>CSVのアップロード</FormLabel>
            <UploadFileField
              name="csv"
              tranformHeader={mapCSVHeader}
            />
          </FormSection>
        </Form>

        <section className="overflow-x-hidden mt-2">
          {csvData?.data?.length > 0 && (
            <>
              <div className="flex my-5 gap-3">
                <CsvStataticsCard
                  title="CSV行の合計"
                  Icon={FileText}
                  iconBg="bg-purple-400"
                  data={csvData?.data?.length}
                />
                <CsvStataticsCard
                  title="有効な行"
                  Icon={CheckCircle}
                  iconBg="bg-blue-400"
                  data={validCount}
                />
                <CsvStataticsCard
                  title="エラー数"
                  Icon={TriangleAlert}
                  iconBg="bg-red-400"
                  data={errorCount}
                />
              </div>

              <Card className="p-5">
                <Text color="secondary">CSVプレビュー</Text>
                <PaginatedDataTable
                  data={getPageData(validatedData, page, pageSize).map(
                    (value, index) => ({
                      ...value,
                      id: (index + 1).toString(),
                    }),
                  )}
                  columns={columns as any} // TODO: NEED TO REFACTOR THIS TYPE
                  dataCount={csvData.data?.length ?? 0}
                  showDataCount
                  pagination={{
                    page,
                    pageSize,
                    total: validatedData.length,
                    onPageChange: setPage,
                  }}
                />
              </Card>
            </>
          )}
        </section>
      </PageLayout>
    </>
  )
}
