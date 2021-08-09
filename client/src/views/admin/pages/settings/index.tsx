import React from 'react';
import { useGetSettingsQuery, useUpdateSettingsMutation } from 'src/graphql/generated/dist';
import { Checkbox, Grid, GridRow, Segment } from 'semantic-ui-react';

const Settgins = () => {
  const { data: { getSettings = {} } = {}, loading, error } = useGetSettingsQuery();
  const [updateSettings, { error: updateError }] = useUpdateSettingsMutation();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;
  if (updateError) return <div>{updateError.message}</div>;
  return (
    <GridRow className='mt-3 mb-3'>
      <Grid className='justify-content-center'>
        <Grid.Column width={4}>
          <Segment>
            <h5 className='text-center'>Settings</h5>
            <div className='d-flex justify-content-between'>
              <div className='text-muted'>Enable Registration</div>
              <div>
                <Checkbox
                  name='enableRegistration'
                  checked={getSettings?.enableRegistration || false}
                  onChange={(_e, { checked }) => updateSettings({ variables: { data: { enableRegistration: checked } } })}
                  toggle
                />
              </div>
            </div>
            {/* <div className='d-flex justify-content-between'>
            <div className='text-muted'>Database Ready</div>
            <div>{controllerVersion.databaseReady ? 'Yes' : 'No'}</div>
          </div> */}

            <div className='d-flex justify-content-between'>
              {/* <div className='text-muted'>Email</div> */}
              {/* <div>{me?.email}</div> */}
            </div>
          </Segment>
        </Grid.Column>
      </Grid>
    </GridRow>
  );
};

export default Settgins;
