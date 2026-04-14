import { LoginForm } from '../components/auth/LoginForm';
import { Footer } from '../components/layout/Footer';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-secondary-dark flex flex-col items-center justify-center p-4">
      {/* Dot grid background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col items-center justify-center">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/dai-logo.png" alt="DAI Logo" className="w-20 h-20 rounded-2xl object-cover shadow-lift" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-1">DAI-PMS</h1>
          <p className="text-white/60 text-sm">Department of Artificial Intelligence — Project Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl3 p-5 sm:p-8 shadow-lift w-full">
          <h2 className="font-display text-2xl text-white mb-6">Sign In</h2>
          <LoginForm />
          <p className="text-center text-white/30 text-xs mt-6">
            Hint: Use your student/employee ID as email.
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full">
        <Footer light />
      </div>
    </div>
  );
}
