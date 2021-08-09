import React from 'react';
import { Placeholder } from 'semantic-ui-react';

/* 
    Placeholder Lines helperFunction
*/

interface LineProps {
  lines: Number;
}

const LoaderLines = ({ lines }: LineProps): JSX.Element => {
  let Line = [];
  for (let i = 0; i < lines; i++) {
    Line.push(<Placeholder.Line key={i} />);
  }
  //@ts-ignore
  return Line;
};

/* 
    Placeholder Rows
*/
interface RowProps {
  row: Number;
  lines: Number;
  fluid?: false | true;
}
export const LoaderPlaceholder = ({ row, lines, fluid }: RowProps): JSX.Element => {
  let Place = [];
  for (let i = 0; i < row; i++) {
    Place.push(
      <Placeholder fluid={fluid} key={i}>
        <LoaderLines lines={lines} />
      </Placeholder>
    );
  }
  //@ts-ignore
  return Place;
};

/* 
    Placeholder Rows
*/
interface ImageRowProps {
  row: Number;
  lines: Number;
  fluid?: false | true;
  image?: false | true;
}
export const LoaderPlaceholderWithImage = ({ row, lines, fluid, image }: ImageRowProps): JSX.Element => {
  let Place = [];
  for (let i = 0; i < row; i++) {
    Place.push(
      <Placeholder fluid={fluid} key={i}>
        <Placeholder.Header image={image}>
          <LoaderLines lines={lines} />
        </Placeholder.Header>
      </Placeholder>
    );
  }
  //@ts-ignore
  return Place;
};
