import { useDeleteNetworkMutation, ZtnetworksDocument } from 'client/graphql/generated/dist';
import React from 'react';
import { Button, Header, Icon, Modal } from 'semantic-ui-react';

interface Props {
  data: any;
  cancle: () => void;
}
const DeleteNetworkModal = ({ data, cancle }: Props) => {
  const [removeNetwork] = useDeleteNetworkMutation();

  const Yes = () => {
    removeNetwork({
      variables: { nwid: data.nwid },
      refetchQueries: [{ query: ZtnetworksDocument }],
    }).then(() => cancle());
  };

  return (
    <Modal basic open={data.open} size='small'>
      <Header icon>
        <Icon name='delete calendar' color='red' />
        Do you really want to delete this network?
      </Header>
      <Modal.Content>
        <div className='text-center'>
          <p>This cannot be undone!</p>
        </div>
      </Modal.Content>
      <Modal.Actions>
        <div className='text-center'>
          <Button basic color='red' inverted onClick={() => cancle()}>
            <Icon name='remove' /> No
          </Button>
          <Button color='green' inverted onClick={() => Yes()}>
            <Icon name='checkmark' /> Yes
          </Button>
        </div>
      </Modal.Actions>
    </Modal>
  );
};

export default DeleteNetworkModal;
