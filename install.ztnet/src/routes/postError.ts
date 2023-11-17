import { Request, Response } from "express";
import nodeMailer from "nodemailer";

//fetch uavcast versions
export const postError = async function (req: Request, res: Response) {
	const post_body = req.body;
	if (process.env.NODE_ENV === "development") {
		return console.log(post_body);
	}

	if (!post_body) return res.status(400).send("No data to submit!");
	if (
		!("version" in post_body) ||
		!("kernel" in post_body) ||
		!("command" in post_body) ||
		!("lineno" in post_body)
	) {
		return res.status(400).send("unknown data format!");
	}

	const transporter = nodeMailer.createTransport({
		host: "send.one.com",
		port: 465,
		secure: true,
		auth: {
			user: process.env.NODE_MAILER_USER,
			pass: process.env.NODE_MAILER_PASSWORD,
		},
	});
	const mailOptions = {
		from: '"ztnet installer" <uavmatrix@uavmatrix.com>', // sender address
		to: "uavmatrix@uavmatrix.com", // list of receivers
		subject: "ZTNET Installation failed!", // Subject line
		// text: post_body, // plain text body
		html: `
        <p>Something went wrong during the ztnet installation!</p><br>
        <b>Error message:</b><br>
        <pre>${JSON.stringify(post_body, null, 2)}</pre>
        `, // html body
	};

	transporter.sendMail(mailOptions, (error: any, info: any) => {
		if (error) {
			return console.log(error);
		}
		if (process.env.NODE_ENV === "development") {
			console.log("Message %s sent: %s", info.messageId, info.response);
			res.render("index");
		}
	});

	res
		.status(200)
		.send(
			"\n>>> Report sent, Thank you!\n>>> For more information, please contact admins or create new issue at github.com\n",
		);
};
