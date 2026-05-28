'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { handleLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock Authentication
    const mockUser = {
      id: '123',
      name: isLogin ? 'DemoUser' : name,
      email: email,
    };
    const mockToken = 'mock_jwt_token_xyz';
    handleLogin(mockUser, mockToken);
    router.push('/');
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-[#e6edf3] mb-6 text-center">
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-[#8b949e] mb-1">Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded p-2 focus:border-[#58a6ff] focus:outline-none transition-colors"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#8b949e] mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded p-2 focus:border-[#58a6ff] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8b949e] mb-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded p-2 focus:border-[#58a6ff] focus:outline-none transition-colors"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold py-2 rounded transition-colors mt-2"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-[#8b949e]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-[#58a6ff] hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
