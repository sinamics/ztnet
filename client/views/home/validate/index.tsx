import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Grid } from 'semantic-ui-react';

import './email-success.css';
import { useValidateEmailMutation } from 'client/graphql/generated/dist';

const Validation = ({ match }: any) => {
  const { token } = match.params;
  const [state, setState] = useState<any>({ showBlock: true, loading: true });
  const [validateMailLink, { loading: validateLoading }] = useValidateEmailMutation();

  const hideBox = () => {
    setState({
      showBlock: false,
      success: false,
      error: false,
    });
  };

  useEffect(() => {
    validateMailLink({
      variables: { token },
    })
      .then(() => {
        setState({ loading: false, showBlock: true });
      })
      .catch((error) => {
        setState({ loading: false, showBlock: false, error: error.message });
      });
  }, [validateMailLink, token]);

  const RedirectMessage = () => {
    setTimeout(() => {
      // history.push('/login');
    }, 5000);
    return <div className='content-text text-muted mt-5'>You will be redirected in 5sec to login page</div>;
  };

  if (validateLoading) return <div>Loading..</div>;

  const { loading, error, showBlock } = state;
  const styles = showBlock ? { display: 'block' } : { display: 'none' };

  return (
    <Grid centered padded>
      {error && (
        <Grid.Column mobile={8} computer={16}>
          <div className='text-danger text-center'>
            <h4>{error}</h4>
            <div className='mt-5'>
              <Link to='/'>
                <h6>Go Back</h6>
              </Link>
            </div>
          </div>
        </Grid.Column>
      )}
      {loading ? (
        <div className='text-muted'>
          <h4>Validerer eposten din...</h4>
        </div>
      ) : (
        <Grid.Column mobile={8} computer={2}>
          <div className='body-box' style={styles}>
            <div className='header-box'>
              <div tabIndex={0} role='button' onClick={hideBox} onKeyDown={hideBox}>
                <i className='fas fa-times-circle exit-button' />
              </div>
            </div>
            <div className='content-box'>
              <i className='content-icon fas fa-check-circle' />
              <div className='content-text'>Email Confirmed!</div>
            </div>
            <div>
              <RedirectMessage />
            </div>
            <div className=''></div>
          </div>
        </Grid.Column>
      )}
    </Grid>
  );
};

Validation.propTypes = {
  match: PropTypes.object.isRequired,
};

export default Validation;
