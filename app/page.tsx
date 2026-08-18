export const dynamic = "force-static";

export default function Home() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <main className="h-dvh w-full overflow-hidden bg-[#fbfaf7]">
      <iframe
        title="Цифровая копия ЛКП"
        src={`${basePath}/lkp.html`}
        className="h-full w-full border-0"
      />
    </main>
  );
}
