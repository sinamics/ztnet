import React, { useState } from 'react';
import { useGetUsersQuery } from 'src/graphql/generated/dist';
import { Table } from './table';
import Adduser from './components/addUser';
import { Button, Grid, GridRow } from 'semantic-ui-react';
import './style.css';

const UserTable = () => {
  const [state, setState] = useState({ adduser: false });

  const { loading, error, data: { getUsers } = {} } = useGetUsersQuery();

  if (loading) return <div></div>;
  if (error) return <div>Error! ${error.message}`</div>;
  return (
    <GridRow className='mt-3 mb-3'>
      <Grid>
        <Grid.Column width={16}>
          <Button onClick={() => setState({ adduser: !state.adduser })}>Add User</Button>
          {state.adduser && <Adduser />}
        </Grid.Column>
        <Grid.Column width={16}>
          <Table tableData={getUsers} />
        </Grid.Column>
      </Grid>
    </GridRow>
  );
};

export default UserTable;
