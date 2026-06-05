'use client';

export default function LandingNav({ onOpenModal }) {
  return (
    <nav className="navbar" id="navbar">
      <a href="#" className="nav-logo">
        <div className="nav-logo-icon">&lt;/&gt;</div>
        <span className="nav-logo-text">Kode<span>Chirp</span></span>
        <span className="nav-logo-leaf">🌿</span>
      </a>
      <nav className="nav-links">
        <a href="#home" className="nav-link active">Home</a>
        <a href="#questions" className="nav-link">Questions</a>
        <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenModal('chirps'); }}>Chirps</a>
        <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenModal('flights'); }}>Flights</a>
        <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenModal('flocks'); }}>Flocks</a>
        <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenModal('nest'); }}>Nest</a>
      </nav>
      <div className="nav-spacer"></div>
      <div className="nav-user" id="navUser">
        <div className="nav-avatar">🦅</div>
        <div className="nav-user-info">
          <div className="nav-user-name">DemoUser</div>
          <div className="nav-user-tag">Keep Chirping!</div>
        </div>
        <span className="nav-chevron">▾</span>
      </div>
    </nav>
  );
}
