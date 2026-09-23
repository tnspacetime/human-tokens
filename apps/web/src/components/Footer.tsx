import PageContainer from './PageContainer'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[var(--bg-base)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <PageContainer className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm tracking-[-0.01em]">
          &copy; {year} Human Tokens. All rights reserved.
        </p>
        <p className="m-0 text-sm tracking-[-0.01em]">
          Pure human tokens.
        </p>
      </PageContainer>
    </footer>
  )
}
