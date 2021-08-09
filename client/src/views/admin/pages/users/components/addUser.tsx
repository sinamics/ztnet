import React, { useState } from 'react';
import { Form, Input, Button, Select, Container } from 'semantic-ui-react';
import { useRegisterMutation } from 'src/graphql/generated/dist';
import { Typography } from '@material-ui/core';

const liucenseStatus = [
  { key: 1, text: 'Active', value: 'active' },
  { key: 2, text: 'Sold', value: 'sold' },
  { key: 3, text: 'Expired', value: 'expired' },
  { key: 4, text: 'Returned', value: 'returned' },
];
const orderStatus = [
  { key: 1, text: 'Completed', value: 'completed' },
  { key: 2, text: 'Cancelled', value: 'Cancelled' },
  { key: 3, text: 'Refunded', value: 'refunded' },
];

const randomPass = Math.random().toString(36).slice(-8);

const AddUser = () => {
  const [state, setState] = useState<any>({ email: '', lastname: '', firstname: '', password: randomPass, licenseKey: '', orderId: 0 });
  const [register, { error: registerError, loading: registerLoading }] = useRegisterMutation({ errorPolicy: 'all' });

  const changeHandler = (e: any) => {
    setState((prev: any) => {
      return {
        ...prev,
        [e.target.name]: e.target.value,
      };
    });
  };
  const dropdownHandler = (_: any, e: any) => {
    setState((prev: any) => {
      return {
        ...prev,
        [e.name]: e.value,
      };
    });
  };
  const submitHandler = () => {
    if (!state.email || !state.firstname || !state.lastname || !state.orderId || !state.password || !state.orderId) return;
    register({ variables: { ...state, orderId: parseInt(state.orderId, 10) } });
  };
  return (
    <Container>
      <div className='mb-2 mt-2'>
        <Typography color='error' component='p' variant='caption'>
          {typeof registerError === 'object' && registerError.message}
        </Typography>
      </div>
      <Form>
        <Form.Group widths='equal'>
          <Form.Field name='firstname' control={Input} label='First name' placeholder='First name' onChange={changeHandler} />
          <Form.Field name='lastname' control={Input} label='Last name' placeholder='Last name' onChange={changeHandler} />
        </Form.Group>
        <Form.Group widths='equal'>
          <Form.Field control={Input} label='Email' name='email' onChange={changeHandler} defaultValue={state.email} placeholder='joe@schmoe.com' />
          <Form.Field control={Input} label='Password' name='password' onChange={changeHandler} defaultValue={state.password} placeholder='xxxx' />
        </Form.Group>
        <Form.Group widths='equal'>
          <Form.Field type='Number' name='orderId' control={Input} label='Order Number' placeholder='Order Number' onChange={changeHandler} />
          <Form.Field name='licenseKey' control={Input} label='License Key' placeholder='License Key' onChange={changeHandler} />
          <Form.Field
            name='licenseStatus'
            control={Select}
            options={liucenseStatus}
            label={{ children: 'License Status' }}
            onChange={dropdownHandler}
            placeholder='License Status'
          />
          <Form.Field
            name='orderStatus'
            control={Select}
            options={orderStatus}
            label={{ children: 'Order Status' }}
            onChange={dropdownHandler}
            placeholder='Order Status'
          />
        </Form.Group>

        <Form.Field id='form-button-control-public' control={Button} content='Create User' label='Submit' onClick={submitHandler} />
        {registerLoading && (
          <img
            alt='register'
            src='data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA=='
          />
        )}
      </Form>
    </Container>
  );
};
export default AddUser;
