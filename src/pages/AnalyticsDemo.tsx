import { ANALYTICS_DEMO, localMedia, openWebLink } from '../config/site';
import { PageChrome } from '../components/PageChrome';
import './pages.css';

export function AnalyticsDemo() {
  return (
    <div className="page page-inner">
      <PageChrome>
        <div className="page-head">
          <h1 className="page-title">Analytics Demo</h1>
          <p className="page-sub">
            Live dashboards open in your browser. This page stays available offline.
          </p>
        </div>
        <div className="page-main">
          <div className="panel analytics-demo-local">
            <img
              className="wide-media"
              src={localMedia('/images/archive/analytics-overview-dashboard.png')}
              alt="Voyant Analytics overview dashboard"
            />
            <div className="text-links">
              <button type="button" onClick={() => openWebLink(ANALYTICS_DEMO)}>
                Open Analytics Demo
              </button>
            </div>
          </div>
        </div>
      </PageChrome>
    </div>
  );
}
