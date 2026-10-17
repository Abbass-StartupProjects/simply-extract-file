import { Rocket, Twitter, Github, Linkedin, ArrowUpRight, MessageSquare } from 'lucide-react';
import { useRouter } from '@/lib/router';

export default function Footer() {
  const { navigate } = useRouter();

  const discoverLinks = [
    { label: 'Growth Channels', action: () => navigate('channels') },
    { label: 'Startup Directory', action: () => navigate('startups') },
    { label: 'Submit Startup', action: () => navigate('submit-startup') },
    { label: 'Submit Channel', action: () => navigate('submit-channel') },
    { label: 'Feedback & Support', action: () => navigate('feedback') },
  ];

  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Africa'];

  return (
    <footer className="relative bg-ink-950 text-ink-400 mt-24 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full bg-accent-600/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Launch<span className="gradient-text">rocket</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-md text-ink-400">
              The global platform where founders discover the best channels to find
              their first customers and showcase their startups to early adopters worldwide.
            </p>
            <div className="flex items-center gap-2.5 mt-6">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="w-9 h-9 rounded-lg bg-ink-900/60 flex items-center justify-center border border-ink-800/80"
                >
                  <Icon className="w-4 h-4 text-ink-400" />
                </span>
              ))}
            </div>
          </div>

          {/* Discover */}
          <div className="md:col-span-3">
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase">Discover</h4>
            <ul className="space-y-3 text-sm">
              {discoverLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={link.action}
                    className="text-ink-400 hover:text-white transition-colors duration-200 inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Regions */}
          <div className="md:col-span-4">
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase">Regions</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {regions.map((region) => (
                <span
                  key={region}
                  className="text-ink-400 px-3 py-1.5 rounded-lg"
                >
                  {region}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-ink-800/80 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-500">
            &copy; {new Date().getFullYear()} Launchrocket. Built for founders, by founders.
          </p>
          <button onClick={() => navigate('feedback')} className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-white transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />
            Feedback & Support
          </button>
        </div>
      </div>
    </footer>
  );
}
