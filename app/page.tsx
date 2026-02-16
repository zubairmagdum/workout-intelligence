import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <main className="max-w-2xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-slate-900 mb-4">
          Workout Intelligence
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          AI-powered training recommendations for serious lifters
        </p>

        <div className="space-y-4">
          <Link
            href="/demo"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Try the Demo
          </Link>

          <p className="text-sm text-slate-500">
            See how the engine prescribes Week 5 from 4 weeks of squat data
          </p>
        </div>
      </main>
    </div>
  );
}

