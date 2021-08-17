/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Container from '@material-ui/core/Container';
import { makeStyles } from '@material-ui/core/styles';
import { useChangePasswordMutation } from 'client/graphql/generated/dist';

// @ts-ignore
import config from 'config';

const useStyles = makeStyles((theme) => ({
  loginWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  loginContainer: {
    backgroundColor: '#e8e8e8e0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 10,
    padding: '10%',
    background: 'white',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
}));

const ResetPassword = ({ match, history }: any) => {
  const { token } = match.params;

  const classes = useStyles();
  const [error, setError] = useState({ message: '', valid: false });
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState({
    password: '',
    newPassword: '',
  });

  const [changePassword, { loading: changeLoading, error: changeError }] = useChangePasswordMutation();

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    if (event.target.name === 'password') {
      const pattern = new RegExp(config.passRegEx);
      setError({ ...error, valid: pattern.test(event.target.value) });
    }
    setUser({
      ...user,
      [name]: value,
    });
  };
  const handleSubmit = (event: any) => {
    event.preventDefault();

    setSubmitted(true);
    if (user.password && user.newPassword) {
      setUser({
        password: '',
        newPassword: '',
      });
      changePassword({ variables: { ...user, token } })
        .then(() => history.push('/login'))
        .catch((err) => console.log(err.message));
    }
  };

  if (changeLoading) return <div>Loading..</div>;

  return (
    <Container component='main' className={classes.loginWrapper} maxWidth='xs'>
      <div className={classes.loginContainer}>
        <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component='h1' variant='h5'>
          Change Password
        </Typography>
        <Typography color='error' component='p' variant='body1'>
          {typeof changeError === 'object' && changeError.message}
        </Typography>
        {/* <Container component="main" maxWidth="xs"> */}
        <form noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Grid className='mb-1'>
                <small className='text-muted'>Must include 6 char, with upper and lowercase and numbers</small>
              </Grid>
              <TextField
                error={!!user.password && !error.valid}
                // variant="outlined"
                required
                fullWidth
                name='password'
                label='Password'
                type='password'
                autoComplete='current-password'
                value={user.password}
                onChange={handleChange}
              />
              {submitted && !user.password && <div className='help-block text-danger'>Passord mangler!</div>}
            </Grid>
            <Grid item xs={12}>
              <TextField
                error={!!user.password && !error.valid}
                // variant="outlined"
                required
                fullWidth
                name='newPassword'
                label='Repeat Password'
                type='password'
                autoComplete='current-password'
                value={user.newPassword}
                onChange={handleChange}
              />
              {submitted && !user.password && <div className='help-block text-danger'>Passord mangler!</div>}
            </Grid>
          </Grid>
          <Button
            type='submit'
            fullWidth
            variant='contained'
            color='primary'
            style={{ background: '#243244', color: 'white' }}
            onClick={handleSubmit}
          >
            Change
          </Button>
          <Grid container justify='flex-end'>
            <Grid item>
              <Link to='/login'>Have an account? Login here</Link>
            </Grid>
          </Grid>
        </form>
        {/* </Container> */}
      </div>
    </Container>
  );
};

export default ResetPassword;
