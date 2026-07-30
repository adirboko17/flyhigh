export default function ClassDetailLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-ink-50">
      <div className="bg-white py-10">
        <div className="container-page">
          <div className="h-4 w-32 rounded-full bg-ink-100" />
          <div className="mt-5 h-10 w-2/3 max-w-md rounded-xl bg-ink-100" />
          <div className="mt-4 h-5 w-full max-w-xl rounded-lg bg-ink-100" />
        </div>
      </div>

      <div className="container-page grid gap-8 pb-16 pt-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="h-72 rounded-3xl bg-ink-100 sm:h-96" />
          <div className="mt-6 grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 rounded-2xl border border-ink-100 bg-white"
              />
            ))}
          </div>
        </div>
        <div className="h-96 rounded-3xl border border-ink-100 bg-white" />
      </div>
    </div>
  );
}
