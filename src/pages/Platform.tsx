import { useNavigate } from 'react-router-dom';
import { PageChrome } from '../components/PageChrome';
import { ANALYTICS_DEMO, localMedia, openWebLink } from '../config/site';
import './pages.css';

const COLUMNS: {
  title: string;
  body: string;
  icon: string;
  links: { label: string; path?: string; href?: string }[];
}[] = [
  {
    title: 'Value Based Storytelling',
    body: 'Quickly change your sales conversations from “Feature” selling to “Value” selling',
    icon: localMedia('/images/.2026/icon-pillar-storytelling.png'),
    links: [{ label: 'Learn More', path: '/storytelling' }],
  },
  {
    title: 'Immersive Experiences',
    body: 'Leverage interactive sales demos based on the value based storytelling created.',
    icon: localMedia('/images/.2026/icon-pillar-immersive.png'),
    links: [
      { label: 'Learn More', path: '/experiences' },
      { label: 'View Examples', path: '/examples' },
    ],
  },
  {
    title: 'User Management',
    body: 'Provide secure access to your interactive sales demo with easy-to-use controls',
    icon: localMedia('/images/.2026/icon-pillar-scalable.png'),
    links: [{ label: 'Learn More', path: '/user-management' }],
  },
  {
    title: 'Analytics & Lead Gen.',
    body: 'Automatically collect Lead Gen. info to identify new sales opportunities.',
    icon: localMedia('/images/.2026/icon-pillar-analytics.png'),
    links: [
      { label: 'Learn More', path: '/analytics' },
      { label: 'View Demo', href: ANALYTICS_DEMO },
    ],
  },
];

export function Platform() {
  const navigate = useNavigate();

  return (
    <div className="page page-platform">
      <PageChrome banner={null}>
        <div className="platform-head">
          <h1 className="platform-title">Immersive Selling Platform</h1>
          <p className="platform-intro">
            Our End-to-End Immersive Selling Platform lets us <strong>deliver interactive demos fast</strong> since
            <br />
            the most <strong>complex pieces are already built</strong> &amp; ready to adapt to your needs.
          </p>
        </div>
        <div className="platform-features">
          <div className="platform-groups">
            <span>Interactive Sales Demos</span>
            <span>Sales Deployment Tools</span>
          </div>
          <div className="platform-grid">
            {COLUMNS.map((column) => (
              <article key={column.title} className="platform-col">
                <img className="platform-icon" src={column.icon} alt="" />
                <h2>{column.title}</h2>
                <p>{column.body}</p>
                <div className="text-links text-links-stack">
                  {column.links.map((link) => (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => {
                        if (link.href) openWebLink(link.href);
                        else if (link.path) navigate(link.path);
                      }}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </PageChrome>
    </div>
  );
}
