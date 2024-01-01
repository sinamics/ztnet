import { Request, Response } from "express";
import nodeMailer from "nodemailer";

//fetch uavcast versions
export const postError = function (req: Request, res: Response) {
	const post_body = req.body;

	// Ensure environment variables are set
	if (!process.env.NODE_MAILER_USER || !process.env.NODE_MAILER_PASSWORD) {
		console.error("NODE_MAILER_USER or NODE_MAILER_PASSWORD is not set.");
		return;
	}

	if (!post_body) return res.status(400).send("No data to submit!");
	if (
		!("runner" in post_body) ||
		!("kernel" in post_body) ||
		!("command" in post_body) ||
		!("lineno" in post_body)
	) {
		return res.status(400).send("unknown data structure!");
	}

	const transporter = nodeMailer.createTransport({
		host: "smtp.domeneshop.no",
		port: 465,
		secure: true,
		auth: {
			user: process.env.NODE_MAILER_USER,
			pass: process.env.NODE_MAILER_PASSWORD,
		},
	});
	const mailOptions = {
		from: '"ztnet installer" <post@ztnet.network>', // sender address
		to: "post@ztnet.network", // list of receivers
		subject: "ZTNET Installation failed!", // Subject line
		// text: post_body, // plain text body
		html: `
        <p>Something went wrong during the ztnet installation!</p><br>
        <b>Error message:</b><br>
        <pre>${JSON.stringify(post_body, null, 2)}</pre>
        `,
	};
	try {
		transporter.verify(function(error, success) {
			if (error) {
					console.error("Transporter verification failed:", error);
			} else {
					console.log("Server is ready to take our messages:", success);
					try {
							transporter.sendMail(mailOptions, (error, info) => {
									if (error) {
											console.error("sendMail error:", error);
									} else if (process.env.NODE_ENV === "development") {
											console.log("Message %s sent: %s", info.messageId, info.response);
											// res.render("index"); // Uncomment or modify based on your actual usage
									}
							});
					} catch (error) {
							console.error("An exception occurred when sending the mail:", error);
					}
			}
	});
		transporter.sendMail(mailOptions, (error: any, info: any) => {
			if (error) {
				return console.log(error);
			}
			if (process.env.NODE_ENV === "development") {
				console.log("Message %s sent: %s", info.messageId, info.response);
				res.render("index");
			}
		});
	
	} catch (error) {
		console.log(error);
		return res.status(500).send("Something went wrong!");
	}

	return res
		.status(200)
		.send(
			"\n>>> Report sent, Thank you for letting us know\n\n",
		);
};
