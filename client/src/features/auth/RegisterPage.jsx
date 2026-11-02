import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Card } from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import useSession from '../../lib/session.js';
import { getPostLoginRedirect } from './redirects.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useSession();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    wantsToHelp: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        wantsToHelp: formData.wantsToHelp,
      };

      const data = await api.post('/auth/register', payload);
      login(data.token, data.user);
      toast.success('Registration successful! Welcome to Helpio.');

      const target = getPostLoginRedirect(data.user);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 mb-2">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white text-xl shadow-sm">
            📍
          </span>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            Help<span className="text-primary-600">io</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
        <p className="text-sm text-slate-500 mt-1">Get started with Helpio in seconds</p>
      </div>

      <div className="w-full sm:max-w-md">
        <Card className="shadow-lg border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />

            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={handleChange}
              helperText="Optional, for SMS updates and direct helper contact"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />

            {/* Helper toggle */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 bg-primary-50/60 rounded-xl border border-primary-100 cursor-pointer hover:bg-primary-50 transition-colors">
                <input
                  type="checkbox"
                  name="wantsToHelp"
                  checked={formData.wantsToHelp}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800 block">
                    I want to offer my services as a Helper 🛠️
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Register as a helper to earn money offering skilled services or volunteer in your community.
                  </span>
                </div>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-semibold shadow-md mt-4"
              loading={loading}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default RegisterPage;
