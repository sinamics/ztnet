import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import Button from "@material-ui/core/Button";
import { RESEND_MAIL_ACTIVATION } from "../../common-graphql/mutations";

const EmailNotValidated = ({ auth: { user } }) => {
  const [mail, setMail] = useState({ mailLinkSent: false, sending: false });
  const [sendMailLink] = useMutation(RESEND_MAIL_ACTIVATION);

  const resendMailActivation = () => {
    setMail({ ...mail, sending: true });
    sendMailLink({ variables: { userId: user.userId } }).then(() => setMail({ ...mail, mailLinkSent: true, sending: false }));
  };
  return (
    <div className="text-center mt-5">
      <h4>
        <div>
          <div className="text-danger">
            {user.email + " "}
            <small>
              has not been verified! <br />
            </small>
          </div>

          <small>Check your mail and activate your account before you login</small>
        </div>
      </h4>
      {/* <p className="text-danger">
        {user.email} has not been verified. <br />
        Check your mail and activate your account before you login
      </p> */}
      {!mail.mailLinkSent && !mail.sending ? (
        <Button onClick={() => resendMailActivation()} variant="outlined" className="mt-5">
          Resend mail activation link
        </Button>
      ) : mail.sending ? (
        <h4 className="mt-5">Sending...</h4>
      ) : (
        <h5 className="mt-5 text-success">Mail Sent Successfully!</h5>
      )}
    </div>
  );
};

export default EmailNotValidated;
