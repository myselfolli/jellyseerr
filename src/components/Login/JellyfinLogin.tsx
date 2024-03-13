import EmbyLogoInverted from '@app/assets/services/emby-inverted.svg';
import EmbyLogo from '@app/assets/services/emby.svg';
import JellyfinLogoInverted from '@app/assets/services/jellyfin-icon-only-inverted.svg';
import JellyfinLogo from '@app/assets/services/jellyfin-icon-only.svg';
import Button from '@app/components/Common/Button';
import Tooltip from '@app/components/Common/Tooltip';
import useSettings from '@app/hooks/useSettings';
import { InformationCircleIcon } from '@heroicons/react/24/solid';
import { MediaServerType, ServerType } from '@server/constants/server';
import axios from 'axios';
import { Field, Form, Formik } from 'formik';
import type React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import * as Yup from 'yup';

const messages = defineMessages({
  username: 'Username',
  password: 'Password',
  host: '{mediaServerName} URL',
  email: 'Email',
  emailtooltip:
    'Address does not need to be associated with your {mediaServerName} instance.',
  validationhostrequired: '{mediaServerName} URL required',
  validationhostformat: 'Valid URL required',
  validationemailrequired: 'Email required',
  validationemailformat: 'Valid email required',
  validationusernamerequired: 'Username required',
  validationpasswordrequired: 'Password required',
  validationservertyperequired: 'Please select a server type',
  loginerror: 'Something went wrong while trying to sign in.',
  credentialerror: 'The username or password is incorrect.',
  signingin: 'Signing in…',
  signin: 'Sign In',
  initialsigningin: 'Connecting…',
  initialsignin: 'Connect',
  forgotpassword: 'Forgot Password?',
  servertype: 'Server Type',
});

interface JellyfinLoginProps {
  revalidate: () => void;
  initial?: boolean;
  serverType?: MediaServerType;
  onServerTypeChange?: (type: MediaServerType) => void;
}

const JellyfinLogin: React.FC<JellyfinLoginProps> = ({
  revalidate,
  initial,
  serverType,
  onServerTypeChange,
}) => {
  const toasts = useToasts();
  const intl = useIntl();
  const settings = useSettings();

  if (initial) {
    const LoginSchema = Yup.object().shape({
      host: Yup.string()
        .matches(
          /^(?:(?:(?:https?):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/,
          intl.formatMessage(messages.validationhostformat)
        )
        .required(
          intl.formatMessage(messages.validationhostrequired, {
            mediaServerName: serverType,
          })
        ),
      email: Yup.string()
        .email(intl.formatMessage(messages.validationemailformat))
        .required(intl.formatMessage(messages.validationemailrequired)),
      username: Yup.string().required(
        intl.formatMessage(messages.validationusernamerequired)
      ),
      password: Yup.string(),
      serverType: Yup.string().required(
        intl.formatMessage(messages.validationservertyperequired)
      ),
    });

    const mediaServerFormatValues = {
      mediaServerName:
        serverType === MediaServerType.JELLYFIN
          ? ServerType.JELLYFIN
          : serverType === MediaServerType.EMBY
          ? ServerType.EMBY
          : 'Media Server',
    };

    return (
      <Formik
        initialValues={{
          username: '',
          password: '',
          host: '',
          email: '',
          serverType: '',
        }}
        initialErrors={{ serverType: 'Please select a server type' }} // Initialize errors with an empty object
        initialTouched={{ serverType: true }}
        validationSchema={LoginSchema}
        onSubmit={async (values) => {
          try {
            // Check if serverType is either 'Jellyfin' or 'Emby'
            // if (serverType !== 'Jellyfin' && serverType !== 'Emby') {
            //   throw new Error('Invalid serverType'); // You can customize the error message
            // }

            await axios.post('/api/v1/auth/jellyfin', {
              username: values.username,
              password: values.password,
              hostname: values.host,
              email: values.email,
              serverType: serverType,
            });
          } catch (e) {
            toasts.addToast(
              intl.formatMessage(
                e.message == 'Request failed with status code 401'
                  ? messages.credentialerror
                  : messages.loginerror
              ),
              {
                autoDismiss: true,
                appearance: 'error',
              }
            );
          } finally {
            revalidate();
          }
        }}
      >
        {({
          errors,
          touched,
          isSubmitting,
          isValid,
          values,
          setFieldValue,
        }) => (
          <Form>
            <div className="sm:border-t sm:border-gray-800">
              <label htmlFor="servertype" className="text-label">
                {intl.formatMessage(messages.servertype)}
              </label>
              <div className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                <div className="flex space-x-4 rounded-md shadow-sm">
                  <button
                    type="button"
                    className={`server-type-button jellyfin-server ${
                      serverType === MediaServerType.JELLYFIN
                        ? 'bg-gradient-to-r from-[#AA5CC3] to-[#00A4DC]'
                        : ''
                    }`}
                    onClick={() => {
                      onServerTypeChange &&
                        onServerTypeChange(MediaServerType.JELLYFIN);
                      setFieldValue('serverType', ServerType.JELLYFIN);
                    }}
                  >
                    {serverType === MediaServerType.JELLYFIN ? (
                      <JellyfinLogoInverted />
                    ) : (
                      <JellyfinLogo />
                    )}
                  </button>
                  <button
                    type="button"
                    className={`server-type-button emby-server ${
                      serverType === MediaServerType.EMBY ? 'bg-[#51B44A]' : ''
                    }`}
                    onClick={() => {
                      onServerTypeChange &&
                        onServerTypeChange(MediaServerType.EMBY);
                      setFieldValue('serverType', ServerType.EMBY);
                    }}
                  >
                    {serverType === MediaServerType.EMBY ? (
                      <EmbyLogoInverted />
                    ) : (
                      <EmbyLogo />
                    )}
                  </button>
                </div>
                {/* Hidden field */}
                <Field type="hidden" name="serverType" />
                {!values.serverType && errors.serverType && (
                  <div className="error">{errors.serverType}</div>
                )}
              </div>
              <label htmlFor="host" className="text-label">
                {intl.formatMessage(messages.host, mediaServerFormatValues)}
              </label>
              <div className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                <div className="flex rounded-md shadow-sm">
                  <Field
                    id="host"
                    name="host"
                    type="text"
                    placeholder={intl.formatMessage(
                      messages.host,
                      mediaServerFormatValues
                    )}
                  />
                </div>
                {errors.host && touched.host && (
                  <div className="error">{errors.host}</div>
                )}
              </div>
              <label
                htmlFor="email"
                className="text-label"
                style={{ display: 'inline-flex' }}
              >
                {intl.formatMessage(messages.email)}
                <span className="label-tip">
                  <Tooltip
                    content={intl.formatMessage(
                      messages.emailtooltip,
                      mediaServerFormatValues
                    )}
                  >
                    <span className="tooltip-trigger">
                      <InformationCircleIcon className="h-4 w-4" />
                    </span>
                  </Tooltip>
                </span>
              </label>
              <div className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                <div className="flex rounded-md shadow-sm">
                  <Field
                    id="email"
                    name="email"
                    type="text"
                    placeholder={intl.formatMessage(messages.email)}
                  />
                </div>
                {errors.email && touched.email && (
                  <div className="error">{errors.email}</div>
                )}
              </div>
              <label htmlFor="username" className="text-label">
                {intl.formatMessage(messages.username)}
              </label>
              <div className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                <div className="flex rounded-md shadow-sm">
                  <Field
                    id="username"
                    name="username"
                    type="text"
                    placeholder={intl.formatMessage(messages.username)}
                  />
                </div>
                {errors.username && touched.username && (
                  <div className="error">{errors.username}</div>
                )}
              </div>
              <label htmlFor="password" className="text-label">
                {intl.formatMessage(messages.password)}
              </label>
              <div className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                <div className="flexrounded-md shadow-sm">
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    placeholder={intl.formatMessage(messages.password)}
                  />
                </div>
                {errors.password && touched.password && (
                  <div className="error">{errors.password}</div>
                )}
              </div>
            </div>
            <div className="mt-8 border-t border-gray-700 pt-5">
              <div className="flex justify-end">
                <span className="inline-flex rounded-md shadow-sm">
                  <Button
                    buttonType="primary"
                    type="submit"
                    disabled={isSubmitting || !isValid}
                  >
                    {isSubmitting
                      ? intl.formatMessage(messages.signingin)
                      : intl.formatMessage(messages.signin)}
                  </Button>
                </span>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    );
  } else {
    const LoginSchema = Yup.object().shape({
      username: Yup.string().required(
        intl.formatMessage(messages.validationusernamerequired)
      ),
      password: Yup.string(),
    });
    const baseUrl = settings.currentSettings.jellyfinExternalHost
      ? settings.currentSettings.jellyfinExternalHost
      : settings.currentSettings.jellyfinHost;
    const jellyfinForgotPasswordUrl =
      settings.currentSettings.jellyfinForgotPasswordUrl;
    return (
      <div>
        <Formik
          initialValues={{
            username: '',
            password: '',
          }}
          validationSchema={LoginSchema}
          onSubmit={async (values) => {
            try {
              await axios.post('/api/v1/auth/jellyfin', {
                username: values.username,
                password: values.password,
                email: values.username,
              });
            } catch (e) {
              toasts.addToast(
                intl.formatMessage(
                  e.message == 'Request failed with status code 401'
                    ? messages.credentialerror
                    : messages.loginerror
                ),
                {
                  autoDismiss: true,
                  appearance: 'error',
                }
              );
            } finally {
              revalidate();
            }
          }}
        >
          {({ errors, touched, isSubmitting, isValid }) => {
            return (
              <>
                <Form>
                  <div className="sm:border-t sm:border-gray-800">
                    <label htmlFor="username" className="text-label">
                      {intl.formatMessage(messages.username)}
                    </label>
                    <div className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                      <div className="flex max-w-lg rounded-md shadow-sm">
                        <Field
                          id="username"
                          name="username"
                          type="text"
                          placeholder={intl.formatMessage(messages.username)}
                        />
                      </div>
                      {errors.username && touched.username && (
                        <div className="error">{errors.username}</div>
                      )}
                    </div>
                    <label htmlFor="password" className="text-label">
                      {intl.formatMessage(messages.password)}
                    </label>
                    <div className="mt-1 mb-2 sm:col-span-2 sm:mt-0">
                      <div className="flex max-w-lg rounded-md shadow-sm">
                        <Field
                          id="password"
                          name="password"
                          type="password"
                          placeholder={intl.formatMessage(messages.password)}
                        />
                      </div>
                      {errors.password && touched.password && (
                        <div className="error">{errors.password}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-8 border-t border-gray-700 pt-5">
                    <div className="flex justify-between">
                      <span className="inline-flex rounded-md shadow-sm">
                        <Button
                          as="a"
                          buttonType="ghost"
                          href={
                            jellyfinForgotPasswordUrl
                              ? `${jellyfinForgotPasswordUrl}`
                              : `${baseUrl}/web/index.html#!/${
                                  settings.currentSettings.mediaServerType ===
                                  MediaServerType.EMBY
                                    ? 'startup/'
                                    : ''
                                }forgotpassword.html`
                          }
                        >
                          {intl.formatMessage(messages.forgotpassword)}
                        </Button>
                      </span>
                      <span className="inline-flex rounded-md shadow-sm">
                        <Button
                          buttonType="primary"
                          type="submit"
                          disabled={isSubmitting || !isValid}
                        >
                          {isSubmitting
                            ? intl.formatMessage(messages.signingin)
                            : intl.formatMessage(messages.signin)}
                        </Button>
                      </span>
                    </div>
                  </div>
                </Form>
              </>
            );
          }}
        </Formik>
      </div>
    );
  }
};

export default JellyfinLogin;
