import React, { useState } from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import { Link, withRouter } from 'react-router-dom';
import { RouteComponentProps } from 'react-router';
import { setAccessToken } from '../../utils/accessToken';
import { MeDocument, MeQuery, useLoginMutation } from 'client/graphql/generated/dist';

function Copyright() {
  return (
    <Typography variant='body2' color='textSecondary' align='center'>
      Powered by <a href='https://uavmatrix.com'>https://uavmatrix.com</a> @
      {/* <NavLink color="inherit" href="">
                Innbytte.no
            </NavLink>{' '} */}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const useStyles = makeStyles((theme) => ({
  loginWrapper: {
    // marginTop: theme.spacing(8),
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
  form: {
    // width: "100%", // Fix IE 11 issue.
    // marginTop: theme.spacing(3),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

interface LoginProps {
  history: any;
  match: any;
}

const LoginPage: React.FC<RouteComponentProps> = ({ history }: LoginProps) => {
  const classes = useStyles();
  const [user, setUser] = useState({ email: '', password: '' });

  const [submitted, setSubmitted] = useState(false);
  // const [login] = useMutation(LOGIN);
  const [login, { error: loginError, loading: loginLoading }] = useLoginMutation({ errorPolicy: 'all' });

  // if (data && data.login) setAccessToken(data.login.accessToken);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    setSubmitted(true);
    if (user.email && user.password) {
      await login({
        variables: { ...user },
        // Fetch user and cache data
        update: (store, { data }): any => {
          if (!data || !data.login) {
            return null;
          }

          store.writeQuery<MeQuery>({
            query: MeDocument,
            data: {
              me: data.login.user,
            },
          });
        },
      })
        .then(({ errors, data }): any => {
          if (errors) return;

          if (data && data.login && data.login.user?.firstTime) {
            return setAccessToken(data.login.accessToken).then(() => {
              history.push('/firstLoginChangePassword');
            });
          }

          if (data && data.login) {
            setAccessToken(data.login.accessToken).then(() => {
              history.push('/dashboard');
            });
          }
        })
        .catch((err) => console.log(err));
    }
  };

  return (
    <Container className={classes.loginWrapper} maxWidth='xs'>
      {/* <CssBaseline /> */}
      <div className={classes.loginContainer}>
        <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component='h1' variant='h5'>
          Login
        </Typography>
        <Typography color='error' component='p' variant='body1'>
          {typeof loginError === 'object' && loginError.message}
        </Typography>
        <form className={classes.form} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField required fullWidth id='email' label='Email Address' name='email' autoComplete='email' onChange={handleChange} />
              {submitted && !user.email && <div className='help-block text-danger'>email is required!</div>}
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name='password'
                label='Password'
                type='password'
                id='password'
                autoComplete='current-password'
                onChange={handleChange}
              />
              {submitted && !user.password && <div className='help-block text-danger'>password is required!</div>}
            </Grid>
            <Grid item xs={12}>
              {/* <FormControlLabel
                                control={<Checkbox value="allowExtraEmails" color="primary" />}
                                label="Jeg har lest og forstått rettighetene beskrevet i innbytte.no policy"
                            /> */}
            </Grid>
          </Grid>
          <Button
            disabled={loginLoading}
            type='submit'
            fullWidth
            variant='contained'
            color='primary'
            className={classes.submit}
            onClick={handleSubmit}
          >
            Login
          </Button>
          {loginLoading && (
            <img
              alt='loginLogo'
              src='data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA=='
            />
          )}
          <Grid container justify='space-between'>
            <Grid item style={{ cursor: 'pointer' }}>
              <Link to='/forgot'>Forgot password?</Link>
            </Grid>
            <Grid item style={{ cursor: 'pointer' }}>
              <Link to='/register'>Register</Link>
            </Grid>
          </Grid>
        </form>
        <Box mt={5}>
          <Copyright />
        </Box>
      </div>
    </Container>
  );
};

export default withRouter(LoginPage);
