export const inviteUserTemplate = () => {
  return {
    inviteUserBody:
      "Hi <b><%= toEmail %></b><br /><%= fromName %> wants you to join the ztnet network: <%= nwid %><br />If you do not know Bernt Christian Egeland, please ignore this message!<br /><br />Use the ZeroTier One GUI or command line on your device to join the network: <%= nwid %><br />For Example:<br />zerotier-cli join <%= nwid %><br /><br />Make sure to let <%= fromName %> know your device ID so that they can authorize it.<br /><br />For detailed instructions and download links, visit:<br />https://www.zerotier.com/download.shtml<br /><br />Sincerely,<br />--<br />Next Ztnet",
    inviteUserSubject: "Next Ztnet -- Invitation to join network: <%= nwid %>",
  };
};
