import React from 'react';
import { ControllerTable } from './controllerTable';
import { Grid, GridRow, Segment } from 'semantic-ui-react';
import { useControllerStatsQuery } from 'src/graphql/generated/dist';
import './style.css';

const Controller = (props: any) => {
  const { loading, error, data: { controllerStats = {} } = {} } = useControllerStatsQuery();

  if (loading) return <div>Loading Controller stats...</div>;
  if (error) return <div>Error! ${error.message}`</div>;

  const { stats, controllerVersion, nodes }: any = controllerStats;

  return (
    <GridRow className='mt-3 mb-3'>
      <Grid className='justify-content-center'>
        <Grid.Column width={4}>
          <Segment>
            <h5>Controller</h5>
            <div className='d-flex justify-content-between'>
              <div className='text-muted'>Api Version</div>
              <div>{controllerVersion.apiVersion}</div>
            </div>
            <div className='d-flex justify-content-between'>
              <div className='text-muted'>Database Ready</div>
              <div>{controllerVersion.databaseReady ? 'Yes' : 'No'}</div>
            </div>

            <div className='d-flex justify-content-between'>
              {/* <div className='text-muted'>Email</div> */}
              {/* <div>{me?.email}</div> */}
            </div>
          </Segment>
        </Grid.Column>
        <Grid.Column width={4}>
          <Segment>
            <h5>Members</h5>
            <div className='d-flex justify-content-between'>
              <div className='text-muted'>Total Nodes</div>
              <div>{stats.totalNodes}</div>
            </div>
            <div className='d-flex justify-content-between'>
              <div className='text-muted'>Total Networks</div>
              <div>{stats?.totalNetworks}</div>
            </div>

            <div className='d-flex justify-content-between'>
              {/* <div className='text-muted'>Email</div> */}
              {/* <div>{me?.email}</div> */}
            </div>
          </Segment>
        </Grid.Column>
        <Grid.Column width={16}>{/* <ControllerTable tableData={data} /> */}</Grid.Column>
      </Grid>
      <Grid>
        <Grid.Column width={16}>
          <ControllerTable {...props} tableData={nodes} />
        </Grid.Column>
      </Grid>
    </GridRow>
  );
};

export default Controller;
