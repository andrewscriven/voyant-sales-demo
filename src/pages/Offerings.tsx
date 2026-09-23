import { useNavigate } from 'react-router-dom';
import { PageChrome } from '../components/PageChrome';
import { ANALYTICS_DEMO, localMedia, openWebLink } from '../config/site';
import './pages.css';

export function Offerings() {
  const navigate = useNavigate();

  return (
    <div className="page page-inner">
      <PageChrome>
        <div className="page-head">
          <h1 className="page-title">Our Offerings</h1>
          <p className="page-sub">A modular suite of Immersive &amp; Interactive Sales Demos, real-time Analytics and Access Management</p>
        </div>
        <div className="page-main">
          <div className="offerings-grid">
            <article className="offering-card">
              <h2>Interactive Sales Demos</h2>
              <div className="offering-rows">
                <div className="offering-row">
                  <img src={localMedia('/images/offerings-1.png')} alt="Internal desktop demo" />
                  <div>
                    <span className="tag tag-base">Base Package</span>
                    <h3>Internal Sales Version&nbsp;&nbsp;<span className="offering-title-note">Installer</span></h3>
                    <p>Internal Win. Desktop exe used offline by Sales, Partners &amp; Marketing teams.</p>
                    <ul>
                      <li>Customer Meetings</li>
                      <li>Tradeshows &amp; Events</li>
                      <li>Internal Training</li>
                    </ul>
                  </div>
                </div>
                <div className="offering-row">
                  <img src={localMedia('/images/offerings-2.png')} alt="External web demo" />
                  <div>
                    <span className="tag tag-optional">Optional</span>
                    <h3>External Customer Version&nbsp;&nbsp;<span className="offering-title-note">Web</span></h3>
                    <p>External online Web version linked from client’s website &amp; used by Customers.</p>
                    <ul>
                      <li>Customers online</li>
                      <li>Social Media Campaigns</li>
                      <li>Lead Generation</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="text-links">
                <button type="button" onClick={() => navigate('/experiences')}>Learn More</button>
                <button type="button" onClick={() => navigate('/examples')}>View Examples</button>
              </div>
            </article>

            <article className="offering-card">
              <h2>Sales Deployment Hub</h2>
              <div className="offering-rows">
                <div className="offering-row">
                  <img src={localMedia('/images/offerings-3.png')} alt="Analytics dashboards" />
                  <div>
                    <span className="tag tag-optional">Optional</span>
                    <h3>Analytics Dashboards</h3>
                    <p>Online usage &amp; analytics dashboard for both Sales Teams and Customers.</p>
                    <ul>
                      <li>View Sales/Partner Usage</li>
                      <li>View Customer Usage</li>
                      <li>Drive Lead Generation</li>
                    </ul>
                  </div>
                </div>
                <div className="offering-row">
                  <img src={localMedia('/images/offerings-4.png')} alt="User management" />
                  <div>
                    <span className="tag tag-optional">Optional</span>
                    <h3>User Management</h3>
                    <p>Give partners access to your immersive experiences with flexible user mgmt.</p>
                    <ul>
                      <li>Send email invites</li>
                      <li>Grant user/business access</li>
                      <li>Revoke user/business access</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="text-links">
                <button type="button" onClick={() => navigate('/analytics')}>Learn More</button>
                <button type="button" onClick={() => openWebLink(ANALYTICS_DEMO)}>View Demo</button>
              </div>
            </article>
          </div>
        </div>
      </PageChrome>
    </div>
  );
}
