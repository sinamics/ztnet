import React from 'react';
import { Card, CardTitle, CardText } from 'reactstrap';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';

interface props {
  title: string;
  content: string;
  color: string;
  faded: boolean;
  onClick: () => void;
}

export default function SimpleCard({ title, content, color, faded, onClick }: props) {
  return (
    <div onClick={onClick} style={{ opacity: faded ? '0.3' : '1', cursor: 'pointer' }}>
      <Card body outline color={color} style={{ border: faded ? 'dotted 0.1em' : '' }}>
        <CardTitle tag='h5'>
          {title}
          {!faded && (
            <span className='float-right'>
              <CheckCircleOutlineIcon style={{ color: color }} />
            </span>
          )}
        </CardTitle>
        <CardText>
          <small>{content}</small>
        </CardText>
      </Card>
    </div>
  );
}
