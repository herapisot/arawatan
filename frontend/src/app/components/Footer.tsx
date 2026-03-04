import { Link } from "react-router";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={className} style={{ background: 'linear-gradient(135deg, #344f1f 0%, #344f1f 50%, color-mix(in srgb, #344f1f 70%, #f4991a) 80%, color-mix(in srgb, #344f1f 60%, #ffffff) 100%)', color: 'var(--primary-foreground)' }}>
      <div className="container mx-auto px-4 py-8" style={{ color: 'var(--primary-foreground)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h3 className="text-xl font-extrabold tracking-wide" style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>ARAWATAN</h3>
                <p className="text-xs font-medium text-white/90" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>Est. 2026</p>
              </div>
            </div>
            <p className="text-sm text-white font-medium leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
              The official ARAWATAN platform for Mindoro State University.
            </p>
            <div className="mt-4">
              <h5 className="font-bold mb-2 text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>About ARAWATAN</h5>
              <p className="text-sm text-white font-medium mb-2 leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>The official ARAWATAN platform for Mindoro State University.</p>
              <div className="text-sm text-white font-medium leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                <div>Email: arawatan@minsu.edu.ph</div>
                <div>Phone: (+63) 441-104-013</div>
                <div>Address: Alcate, Victoria, Oriental Mindoro</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>Campus Locations</h4>
            <ul className="text-sm space-y-2 text-white font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <li>Main Campus - Victoria</li>
              <li>Bongabong Campus</li>
              <li>Calapan City Campus</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>Quick Links</h4>
            <ul className="text-sm space-y-2 font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <li>
                <Link to="/" className="transition-colors hover:text-white/70 text-white">Home</Link>
              </li>
              <li>
                <Link to="/about" className="transition-colors hover:text-white/70 text-white">About</Link>
              </li>
              <li>
                <Link to="/forum" className="transition-colors hover:text-white/70 text-white">Forum</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>Contact</h4>
            <ul className="text-sm space-y-2 text-white font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <li>Email: arawatan@minsu.edu.ph</li>
              <li>Phone: (+63) 441-104-013</li>
              <li>Address: Alcate, Victoria, Oriental Mindoro</li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-6 text-center text-sm" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          <p className="text-white font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>&copy; 2026 Mindoro State University. All rights reserved.</p>
          <p className="mt-1 text-white/90 font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>For exclusive use by MinSU community members only.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
