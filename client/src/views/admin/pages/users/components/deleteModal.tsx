import { useRemoveUserMutation, GetUsersDocument } from 'src/graphql/generated/dist';
import React from 'react';
import { Button, Header, Icon, Modal } from 'semantic-ui-react';

interface Props {
  userid: string;
  open: boolean;
  cancle: () => void;
}
const DeleteUserModal = ({ open, userid, cancle }: Props) => {
  const [deleteUser] = useRemoveUserMutation({
    refetchQueries: [{ query: GetUsersDocument }],
  });

  const Yes = () => {
    deleteUser({ variables: { userid } }).then(() => cancle());
  };

  return (
    <Modal basic open={open} size='small'>
      <Header icon>
        <Icon name='delete calendar' color='red' />
        Do you really want to delete this user?
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

export default DeleteUserModal;
