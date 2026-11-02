import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-slate-50 py-16 sm:py-24 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Badge variant="primary" size="lg" className="mb-4 shadow-sm">
            🚀 The Hyperlocal Help & Workforce Platform
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Local help. <span className="text-primary-600">Just a tap away.</span>
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Connect with skilled, verified, and nearby helpers in minutes for everyday needs,
            professional services, and emergency tasks.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto shadow-md">
                Get Started Now
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                How It Works
              </Button>
            </a>
          </div>

          {/* Value Chips */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-sm border border-slate-200 text-sm font-semibold text-slate-700">
              <span className="text-primary-600">📍</span> Nearby Help
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-sm border border-slate-200 text-sm font-semibold text-slate-700">
              <span className="text-accent-500">⭐</span> Trusted Helpers
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-sm border border-slate-200 text-sm font-semibold text-slate-700">
              <span className="text-emerald-500">⚡</span> Quick Service
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How Helpio Works</h2>
            <p className="mt-2 text-slate-500 text-sm sm:text-base">
              From your initial request to a completed job, we make finding local assistance effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                step: '01',
                title: 'Post',
                icon: '📝',
                desc: 'Describe what you need, your location, urgency, and schedule.',
              },
              {
                step: '02',
                title: 'Match',
                icon: '🎯',
                desc: 'Our engine instantly ranks and offers the job to nearby available helpers.',
              },
              {
                step: '03',
                title: 'Connect',
                icon: '💬',
                desc: 'A verified helper accepts. Coordinate directly via private chat.',
              },
              {
                step: '04',
                title: 'Work',
                icon: '🛠️',
                desc: 'The helper arrives and completes the job safely and transparently.',
              },
              {
                step: '05',
                title: 'Rate',
                icon: '⭐',
                desc: 'Confirm completion, complete payment seamlessly, and leave a review.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col items-center text-center hover:border-primary-200 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl mb-4 border border-slate-200">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-primary-600 tracking-wider mb-1 uppercase">
                  Step {item.step}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Service Areas</h2>
            <p className="mt-2 text-slate-500 text-sm sm:text-base">
              Choose from community volunteers to certified tradespeople and on-demand labor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="flex flex-col h-full border-t-4 border-t-emerald-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">🤝</span>
                <Badge variant="success">Free Service</Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Community Help</h3>
              <p className="text-sm text-slate-600 mb-6 flex-1">
                Volunteer and neighbourhood support for seniors, students, and everyday mutual aid.
                Free of charge with optional tips.
              </p>
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-2">Popular:</span>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Student help</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Elderly care</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Errands</span>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col h-full border-t-4 border-t-primary-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">🔧</span>
                <Badge variant="primary">Fixed Visit Charge</Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Professional Help</h3>
              <p className="text-sm text-slate-600 mb-6 flex-1">
                Verified technicians and tradespeople for household repairs and skilled installations.
                Clear pricing with transparent quotes.
              </p>
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-2">Popular:</span>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Electrician</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Plumber</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Carpenter</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Technician</span>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col h-full border-t-4 border-t-accent-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">⚡</span>
                <Badge variant="warning">Hourly / Per Visit</Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Instant Local Workforce</h3>
              <p className="text-sm text-slate-600 mb-6 flex-1">
                Fast hands for short, urgent tasks. Moving, cleaning, event support, and on-demand
                help available within minutes.
              </p>
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-2">Popular:</span>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Moving help</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Deep cleaning</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">Delivery</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Helper CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-primary-800 to-primary-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-3xl mb-3 block">🤝</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Earn money helping people in your neighbourhood
          </h2>
          <p className="text-primary-100 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Set your own rates, choose your work radius, and get real-time job offers on your schedule.
            Join our trusted community of local providers today.
          </p>
          <Link to="/register">
            <Button variant="accent" size="lg" className="shadow-lg">
              Become a Helper
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-sm border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <span className="font-bold text-white tracking-tight">Helpio</span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-500">Hyperlocal Help & Workforce Platform</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Helpio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
