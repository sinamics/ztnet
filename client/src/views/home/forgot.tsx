import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import { Link } from 'react-router-dom';
import { useForgotMutation } from 'src/graphql/generated/dist';
import { Box } from '@material-ui/core';

function Copyright() {
  return (
    <Typography variant='body2' color='textSecondary' align='center'>
      {'Powered by uavmatrix.com  @ '}
      <Link color='inherit' to='/'>
        uavmatrix.com
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const useStyles = makeStyles((theme) => ({
  forgotContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 10,
    padding: '10%',
    background: '#e8e8e8e0',
    minWidth: '366px',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(3),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

function ForGot() {
  const classes = useStyles();
  const [user, setUser] = useState({
    email: '',
    read: false,
    sent: false,
  });

  const [submitted, setSubmitted] = useState(false);

  const [forgotAction, { loading: forgotLoading, error: forgotError }] = useForgotMutation();

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setUser({
      ...user,
      [name]: value,
    });
  };
  const handleSubmit = (event: any) => {
    event.preventDefault();

    setSubmitted(true);
    if (user.email) {
      forgotAction({ variables: { email: user.email } })
        .then(() => {
          setUser({
            ...user,
            email: '',
            sent: true,
          });
        })
        .catch((err) => console.log(err.message));
    }
  };

  return (
    <>
      <Container className={classes.forgotContainer} maxWidth='xs'>
        <div className={classes.paper}>
          <Avatar className={classes.avatar}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component='h1' variant='h5'>
            Forgot password
          </Typography>
          <Typography color='error' component='p' variant='body1'>
            {typeof forgotError === 'object' && forgotError.message}
          </Typography>
          <form className={classes.form} noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                {!user.sent ? (
                  <>
                    <TextField
                      // variant="outlined"
                      required
                      fullWidth
                      value={user.email}
                      id='email'
                      label='Email address'
                      name='email'
                      autoComplete='email'
                      onChange={handleChange}
                    />
                    {submitted && !user.email && <div className='help-block text-danger'>email is required!</div>}
                  </>
                ) : (
                  <div className='text-center'>
                    <b>Check your mail</b>
                  </div>
                )}
              </Grid>
            </Grid>
            {!user.sent && (
              <Button disabled={forgotLoading} type='submit' fullWidth variant='contained' color='primary' className={classes.submit} onClick={handleSubmit}>
                Send email
              </Button>
            )}
            <Grid container justify='flex-end'>
              <Grid item>
                <Link to='/login'>Have an account? Login here</Link>
              </Grid>
            </Grid>
          </form>
          {/* </Container> */}
        </div>
        <Box mt={5}>
          <Copyright />
        </Box>
      </Container>
    </>
  );
}

ForGot.propTypes = {
  registering: PropTypes.bool,
  register: PropTypes.func.isRequired,
  message: PropTypes.string,
};

export default ForGot;
