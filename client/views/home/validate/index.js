/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Col, Row } from 'reactstrap';

import './email-success.css';
import { useValidateEmailMutation } from 'client/graphql/generated/dist';

const Validation = ({ match, history }) => {
  const { token } = match.params;
  const [state, setState] = useState({ showBlock: true, loading: true });

  //   const { loading: vehiclesLoading, data: { fetchVehicles } = {} } = useQuery(VALIDATE_USER_EMAIL);
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
      .then((msg) => {
        setState({ loading: false, showBlock: true });
      })
      .catch((error) => {
        setState({ loading: false, showBlock: false, error: error.message });
      });
  }, []);

  const RedirectMessage = () => {
    setTimeout(() => {
      history.push('/login');
    }, 5000);
    return <div className='content-text text-muted mt-5'>You will be redirected in 5sec to login page</div>;
  };

  if (validateLoading) return <div>Loading..</div>;
  // if (validateError) return <div>{validateError.message}</div>;

  const { loading, error, showBlock } = state;
  const styles = showBlock ? { display: 'block' } : { display: 'none' };

  return (
    <Row>
      <Col md='12' className='d-flex justify-content-center mt-5'>
        {error && (
          <div className='text-danger text-center'>
            <h4>{error}</h4>
            <div className='mt-5'>
              <Link to='/'>
                <h6>Go Back</h6>
              </Link>
            </div>
          </div>
        )}
        {loading ? (
          <div className='text-muted'>
            <h4>Validerer eposten din...</h4>
          </div>
        ) : (
          <>
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
              <div className=''>
                {/* <Link to="/login">
                  <Button fullWidth color="primary" variant="contained" width="100%">
                    LogIn Now
                  </Button>
                </Link> */}
              </div>
            </div>
          </>
        )}
      </Col>
    </Row>
  );
};

Validation.propTypes = {
  match: PropTypes.object.isRequired,
};

export default Validation;
