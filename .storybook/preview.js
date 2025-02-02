import '@patternfly/patternfly/patternfly.css';
import '@patternfly/patternfly/utilities/Accessibility/accessibility.css';
import '@patternfly/patternfly/utilities/BackgroundColor/BackgroundColor.css';
import '@patternfly/patternfly/utilities/Display/display.css';
import '@patternfly/patternfly/utilities/Flex/flex.css';
import '@patternfly/patternfly/utilities/Sizing/sizing.css';
import '@patternfly/patternfly/utilities/Spacing/spacing.css';

import React from 'react';
import { I18nProvider } from '@rhoas/app-services-ui-components';
import { BrowserRouter as Router } from 'react-router-dom';
import { addDecorator } from '@storybook/react';
import { initializeWorker, mswDecorator } from 'msw-storybook-addon';
import {
  AlertContext,
  AuthContext,
  ConfigContext,
  QuotaContext,
} from '@rhoas/app-services-ui-shared';

initializeWorker();
addDecorator(mswDecorator);

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: 'Background color 200',
    values: [
      {
        name: 'Background color 100',
        value: '#ffffff',
      },
      {
        name: 'Background color 200',
        value: 'var(--pf-global--BackgroundColor--200)',
      },
    ],
  },
  viewport: {
    viewports: {
      xs: {
        name: 'Breakpoint: xs',
        styles: {
          width: "400px",
          height: '100%'
        }
      },
      sm: {
        name: 'Breakpoint: sm',
        styles: {
          width: "576px",
          height: '100%'
        }
      },
      md: {
        name: 'Breakpoint: md',
        styles: {
          width: "768px",
          height: '100%'
        }
      },
      lg: {
        name: 'Breakpoint: lg',
        styles: {
          width: "992px",
          height: '100%'
        }
      },
      xl: {
        name: 'Breakpoint: xl',
        styles: {
          width: "1200px",
          height: '100%'
        }
      },
      '2xl': {
        name: '2Breakpoint: xl',
        styles: {
          width: "1450px",
          height: '100%'
        }
      },
    }
  }
};

export const decorators = [
  (Story) => (
    <Router>
      <I18nProvider
        lng='en'
        resources={{
          en: {
            common: () =>
              import(
                '@rhoas/app-services-ui-components/locales/en/common.json'
              ),
            'create-kafka-instance': () =>
              import(
                '@rhoas/app-services-ui-components/locales/en/create-kafka-instance.json'
              ),
            kafka: () =>
              import(
                '@rhoas/app-services-ui-components/locales/en/kafka.json'
              ),
            metrics: () =>
              import(
                '@rhoas/app-services-ui-components/locales/en/metrics.json'
              ),
            kasTemporaryFixMe: () =>
              import('../src/app/kas-ui-dont-modify-temporay.json'),
          },
        }}
        debug={true}
      >
        <ConfigContext.Provider
          value={
            {
              kas: {
                apiBasePath: '',
              },
              ams: { trialQuotaId: 'fake-quota-id' },
            }
          }
        >
          <AuthContext.Provider
            value={
              {
                kas: {
                  getToken: () => Promise.resolve('test-token'),
                },
                getUsername: () => Promise.resolve('api_kafka_service'),
              }
            }
          >
            <AlertContext.Provider
              value={{
                addAlert: () => {
                  // No-op
                },
              }}
            >
              <QuotaContext.Provider
                value={{
                  getQuota: () => {
                    return Promise.resolve({
                      loading: true,
                      data: undefined,
                      isServiceDown: false,
                    });
                  },
                }}
              >
                <React.Suspense fallback={null}>
                  <Story />
                </React.Suspense>
              </QuotaContext.Provider>
            </AlertContext.Provider>
          </AuthContext.Provider>
        </ConfigContext.Provider>
      </I18nProvider>
    </Router>
  ),
];
