export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="border-pixel border-brand-black bg-[#FFF1F2] px-3.5 py-2.5 font-sans text-sm font-semibold text-noteDark-coral">
      {message}
    </div>
  );
}

export function FormNotice({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="border-pixel border-brand-black bg-accent-mint px-3.5 py-2.5 font-sans text-sm font-semibold">
      {children}
    </div>
  );
}
