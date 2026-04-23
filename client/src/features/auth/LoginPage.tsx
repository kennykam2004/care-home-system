import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AppleInput, AppleButtonPrimary } from '../../components/ui';

export function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(loginId, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '員工編號或密碼錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="https://upload.wikimedia.org/wikipedia/zh/d/d9/Caritas_Macau_logo.svg"
            alt="明愛"
            className="h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            頤安三院倉存管理系統
          </h1>
          <p className="text-gray-500 mt-2">請登入以繼續</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white/50 p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                員工編號
              </label>
              <AppleInput
                placeholder="請輸入員工編號"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密碼
              </label>
              <AppleInput
                type="password"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-3">
                {error}
              </div>
            )}

            <div className="pt-4">
              <AppleButtonPrimary
                type="submit"
                disabled={isLoading}
                className="w-full justify-center py-3"
              >
                {isLoading ? '登入中...' : '登入'}
              </AppleButtonPrimary>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          頤安(逸麗)護老院 © 2026
        </p>
      </div>
    </div>
  );
}
