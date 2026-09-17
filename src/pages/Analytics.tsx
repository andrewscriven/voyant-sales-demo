import { useState } from 'react';
import { NeonIcon, type IconName } from '../components/NeonIcon';
import { PageChrome } from '../components/PageChrome';
import { Slider } from '../components/Slider';
import { localMedia } from '../config/site';
import './pages.css';

const CAPS: { title: string; body: string; icon: IconName }[] = [
  { title: 'One-Click Dashboards', body: 'Get instant visibility into who’s using your demos, how and when they’re used without any setup or manual reporting.', icon: 'ads-click' },
  { title: 'Sales / Partner Focused Dashboards', body: 'Track and rank sales partners by how often they use the interactive demo, which content they rely on most, and where they present it to customers.', icon: 'chart-data' },
  { title: 'Customer Focused Dashboards', body: 'Use customer engagement data to see what they care about most, keep sales focused on active opportunities, and trigger timely follow-ups.', icon: 'filter-alt' },
  { title: 'Content Usage Analytics', body: 'See exactly which content gets used and what doesn’t, so you can make data-driven decisions and focus resources where they have the most impact.', icon: 'analytics' },
  { title: 'Team Performance Analytics', body: 'Track team performance with usage stats that show how, when, and how often they use the interactive demo.', icon: 'groups' },
  { title: 'Analytics Data Integrations', body: 'Combine interactive demo analytics with your other data sources for deeper cross-analysis and data-driven business decisions.', icon: 'api' },
];

export function Analytics() {
  const [slide, setSlide] = useState(0);

  return (
    <div className="page page-inner">
      <PageChrome>
        <div className="page-head">
          <h1 className="page-title">Analytics & Lead Gen.</h1>
          <p className="page-sub">
            Analyze customer and sales partner usage of your interactive demo and turn engagement into qualified leads.
          </p>
        </div>
        <div className="page-main">
          <Slider index={slide} count={4} onChange={setSlide}>
            {slide === 0 && (
              <div className="panel">
                <img className="wide-media" src={localMedia('/images/archive/analytics-overview-dashboard.png')} alt="Analytics overview dashboard" />
              </div>
            )}
            {slide === 1 && (
              <div className="panel split">
                <img src={localMedia('/images/analytics-adopters.png')} alt="Top adopters and low activity partners" />
                <div>
                  <h2>Optimize Sales Strategy with Channel Partner Analysis</h2>
                  <p>
                    Leverage detailed activity analytics to identify winning behaviors across your sales teams and
                    channel partners, tune and standardize your sales process, and systematically increase conversion
                    rates, deal velocity, and overall revenue performance.
                  </p>
                </div>
              </div>
            )}
            {slide === 2 && (
              <div className="panel split">
                <div>
                  <h2>Track Customer Engagement to Close More Deals</h2>
                  <p>
                    Use content engagement data to see exactly what customers care about, keep sales teams focused on
                    active opportunities, tailor their outreach to the topics customers are interested in, and trigger
                    timely, personalized follow-ups that move opportunities forward faster.
                  </p>
                </div>
                <img src={localMedia('/images/user-management-sales-partners.png')} alt="Customer engagement" />
              </div>
            )}
            {slide === 3 && (
              <div className="panel">
                <div className="panel-box">
                  <h2>Key Functionality &amp; Capabilities</h2>
                  <p>What customers love most about the Voyant Studios analytic dashboards.</p>
                  <div className="card-grid three">
                    {CAPS.map((item) => (
                      <article key={item.title} className="card dark-card">
                        <div className="card-head">
                          <NeonIcon name={item.icon} framed />
                          <h3>{item.title}</h3>
                        </div>
                        <p>{item.body}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Slider>
        </div>
      </PageChrome>
    </div>
  );
}
