import React, { useState } from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';

// import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
// import Link from '@material-ui/core/Link';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import { Link, RouteComponentProps } from 'react-router-dom';
import { MeDocument, MeQuery, useLoginMutation, useRegisterMutation } from 'client/graphql/generated/dist';

// @ts-ignore
import config from 'config';
import { setAccessToken } from 'client/utils/accessToken';

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
  registerWrapper: {
    // marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  registerContainer: {
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

// interface RegisterProps {
//   history: any;
// }

const SignUp: React.FC<RouteComponentProps> = ({ history }) => {
  const classes = useStyles();
  const [user, setUser] = useState<any>({
    firstname: '',
    role: [],
    lastname: '',
    email: '',
    password: '',
    read: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState({ message: '', valid: false });

  const [register, { error: registerError, loading: registerLoading }] = useRegisterMutation({ errorPolicy: 'all' });
  const [login] = useLoginMutation();

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    if (event.target.name === 'password') {
      const pattern = new RegExp(config.passRegEx);
      setError({ ...error, valid: pattern.test(event.target.value) });
    }
    setUser({
      ...user,
      role: ['user'],
      [name]: value,
    });
  };
  const checkboxHandler = (e: any) => {
    setUser({ ...user, read: e.target.checked });
  };
  const handleSubmit = (event: any) => {
    event.preventDefault();

    setSubmitted(true);
    if (user.firstname && user.lastname && user.email && user.password && user.read) {
      register({ variables: { ...user } })
        .then(() => {
          // Instead of let user login after register, we will do it for him
          login({
            variables: { ...user },
            // Fetch user and cache data
            update: (store: any, { data }: any) => {
              if (!data || !data.login) {
                return null;
              }
              // @ts-ignore TODO
              store.writeQuery<MeQuery>({
                query: MeDocument,
                data: {
                  me: data.login.user,
                },
              });

              return null;
            },
          })
            .then(({ errors, data }: any) => {
              if (errors) return history.push('/login');
              if (data && data.login) {
                setAccessToken(data.login.accessToken).then(() => {
                  history.push('/dashboard');
                });
              }
            })
            .catch((err) => console.log(err));
        })
        .catch((err) => console.log(err));
    }
  };

  return (
    <>
      <Container className={classes.registerWrapper} maxWidth='xs'>
        <div className={classes.registerContainer}>
          <Avatar className={classes.avatar}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component='h1' variant='h5'>
            Register
          </Typography>
          <div className='mb-2 mt-2'>
            <Typography color='error' component='p' variant='caption'>
              {typeof registerError === 'object' && registerError.message}
            </Typography>
          </div>
          <form noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  autoComplete='fname'
                  name='firstname'
                  required
                  fullWidth
                  label='First Name'
                  autoFocus
                  value={user.firstname}
                  onChange={handleChange}
                />
                {submitted && !user.firstname && <div className='help-block text-danger'>Firstname Required!</div>}
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField required fullWidth label='Last Name' name='lastname' autoComplete='lname' value={user.lastname} onChange={handleChange} />
                {submitted && !user.lastname && <div className='help-block text-danger'>Lastname Required!</div>}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id='email'
                  type='email'
                  inputProps={{ type: 'email' }}
                  label='Email Address'
                  name='email'
                  autoComplete='email'
                  value={user.email}
                  onChange={handleChange}
                />
                {submitted && !user.email && <div className='help-block text-danger'>Email Required!</div>}
              </Grid>
              <Grid item xs={12}>
                <Grid className='mb-1'>
                  <small className='text-muted'>Must include 6 char, with upper and lowercase and numbers</small>
                </Grid>
                <TextField
                  error={!!user.password && !error.valid}
                  required
                  fullWidth
                  name='password'
                  label='Password'
                  type='password'
                  id='password'
                  autoComplete='current-password'
                  value={user.password}
                  onChange={handleChange}
                />
                {submitted && !user.password && <div className='help-block text-danger'>Password Required!</div>}
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Checkbox value={user.read} onChange={checkboxHandler} color='primary' />}
                  label={
                    <Typography
                      // @ts-ignore
                      style={{ fontSize: '12px', color: submitted && !user.read && 'red' }}
                      variant='body1'
                      component='p'
                    >
                      I confirm that I have read, understand and agree to the policy given by uavmatrix.com <Link to='/infosenter'>Read more</Link>
                    </Typography>
                  }
                />
              </Grid>
            </Grid>
            <Button
              disabled={registerLoading}
              type='submit'
              fullWidth
              variant='contained'
              color='primary'
              className='my-5'
              style={{ background: '#243244', color: 'white' }}
              onClick={handleSubmit}
            >
              Register
            </Button>
            {registerLoading && (
              <img
                alt='register'
                src='data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA=='
              />
            )}
            <Grid container justify='flex-end'>
              <Grid item>
                <Link to='/login'>Have an account? Login here</Link>
              </Grid>
            </Grid>
          </form>
        </div>
        <Box mt={5}>
          <Copyright />
        </Box>
      </Container>
    </>
  );
};

export default SignUp;
