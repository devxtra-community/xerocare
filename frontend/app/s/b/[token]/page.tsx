import { redirect } from 'next/navigation';

/** Forward existing customer bill links to the public approval page. */
export default async function ShortBillApprovalLink({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/public/bill/sign/${encodeURIComponent(token)}`);
}
