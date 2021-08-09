import React from 'react';
import { Step } from 'semantic-ui-react';

const NoNetworkStep = () => (
  <Step.Group size='tiny' fluid ordered>
    <Step>
      {/* <Icon name='arrow right' /> */}
      <Step.Content>
        <Step.Title>Copy the Network ID</Step.Title>
        <Step.Description>This is your VPN ID</Step.Description>
      </Step.Content>
    </Step>

    <Step>
      {/* <Icon name='arrow right' /> */}
      <Step.Content>
        <Step.Title>Paste in UAVcast-Pro</Step.Title>
        <Step.Description>Paste in Zerotier VPN section</Step.Description>
      </Step.Content>
    </Step>

    <Step completed>
      {/* <Icon name='check' /> */}
      <Step.Content>
        <Step.Title>Your Raspberry will show up here!</Step.Title>
      </Step.Content>
    </Step>
  </Step.Group>
);

export default NoNetworkStep;
