/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Container from '@material-ui/core/Container';
import { makeStyles } from '@material-ui/core/styles';
import { useFirstTimeLoginChangePasswordMutation } from 'client/graphql/generated/dist';

// @ts-ignore
import config from 'config';

// import './email-success.css';
const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
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
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(3),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

const FirstLoginChangePassword = ({ history }: any) => {
  const classes = useStyles();
  const [error, setError] = useState({ message: '', valid: false });
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState({
    password: '',
    newPassword: '',
  });

  const [changePassword, { loading: changeLoading, error: changeError }] = useFirstTimeLoginChangePasswordMutation();

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
      changePassword({ variables: { ...user } })
        .then(() => history.push('/dashboard'))
        .catch((err) => console.log(err.message));
    }
  };

  if (changeLoading) return <div>Loading..</div>;

  return (
    <Container component='main' maxWidth='xs'>
      <div className={classes.paper}>
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
        <form className={classes.form} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Grid className='mb-1 mb-2'>
                <small className='text-muted'>This is your first login and we recommend that you change your password </small>
              </Grid>
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
        </form>
        {/* </Container> */}
      </div>
    </Container>
  );
};

export default FirstLoginChangePassword;
