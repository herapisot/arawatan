import { Link } from "react-router";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={className} style={{ background: 'linear-gradient(90deg, rgba(27,94,58,0.85) 0%, rgba(77,182,172,0.75) 100%)', color: '#fff', backdropFilter: 'blur(6px)' }}>
      <div className="container mx-auto px-4 py-8 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h3 className="font-bold">MinSU ARAWATAN</h3>
                <p className="text-xs text-white/80">Est. 2026</p>
              </div>
            </div>
            <p className="text-sm text-white/90">
              The official ARAWATAN platform for Mindoro State University.
            </p>
            <div className="mt-4">
              <h5 className="font-semibold mb-2">About ARAWATAN</h5>
              <p className="text-sm text-white/90 mb-2">The official ARAWATAN platform for Mindoro State University.</p>
              <div className="text-sm text-white/90">
                <div>Email: arawatan@minsu.edu.ph</div>
                <div>Phone: (+63) 441-104-013</div>
                <div>Address: Alcate, Victoria, Oriental Mindoro</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Campus Locations</h4>
            <ul className="text-sm space-y-2 text-white/90">
              <li>Main Campus - Victoria</li>
              <li>Bongabong Campus</li>
              <li>Calapan City Campus</li>
              <li>Bulalacao Campus</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="text-sm space-y-2 text-white/90">
              <li>
                <Link to="/" className="transition-colors hover:opacity-80 text-white/90">Home</Link>
              </li>
              <li>
                <Link to="/about" className="transition-colors hover:opacity-80 text-white/90">About</Link>
              </li>
              <li>
                <Link to="/gallery" className="transition-colors hover:opacity-80 text-white/90">Gallery</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="text-sm space-y-2" style={{ color: '#6B4F3A' }}>
              <li>Email: arawatan@minsu.edu.ph</li>
              <li>Phone: (+63) 441-104-013</li>
              <li>Address: Alcate, Victoria, Oriental Mindoro</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm" style={{ borderColor: '#D4A574', color: '#6B4F3A' }}>
          <p className="text-white/80">&copy; 2026 Mindoro State University. All rights reserved.</p>
          <p className="mt-1 text-white/80">For exclusive use by MinSU community members only.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
