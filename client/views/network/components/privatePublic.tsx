import React from 'react';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import { Card } from 'semantic-ui-react';

interface props {
  title: string;
  content: string;
  color: string;
  faded: boolean;
  onClick: () => void;
}

export default function PrivatePublic({ title, content, color, faded, onClick }: props) {
  return (
    <Card
      onClick={onClick}
      style={{
        border: faded ? `${color} dotted 0.1em` : `${color} solid 0.1em`,
        boxShadow: 'none',
        opacity: faded ? '0.3' : '1',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <Card.Content className='lightdarktheme'>
        <Card.Header>
          {title}
          <span className='float-right'>
            <CheckCircleOutlineIcon style={{ color: color, visibility: faded ? 'hidden' : 'visible' }} />
          </span>
        </Card.Header>
        <Card.Description>
          <small>{content}</small>
        </Card.Description>
      </Card.Content>
    </Card>
  );
}
