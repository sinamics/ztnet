import cn from "classnames";
import { useRef } from "react";
import { useOnClickOutside } from "usehooks-ts";
import { useModalStore } from "~/utils/store";

// interface Imodal {
//   children: React.ReactNode;
//   disableClickOutside?: boolean;
//   onClose(): void;
// }

const Modal = () => {
  const ref = useRef(null);
  const {
    isOpen,
    description,
    title,
    yesAction,
    toggleModal,
    disableClickOutside,
    closeModal,
  } = useModalStore((state) => state);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  useOnClickOutside(ref, () => {
    if (!disableClickOutside) {
      closeModal();
    }
  });
  const actionHandler = () => {
    yesAction();
    toggleModal();
  };
  const modalClass = cn({
    "modal modal-bottom sm:modal-middle z-20 ": true,
    "modal-open": isOpen,
  });
  return (
    // we add modal-bottom and modal-middle classes to make it responsive
    //add modal-open for now to test the modal
    <div className={modalClass}>
      {/* we want any content for this modal layout so we just pass the children */}
      <div className="modal-box relative bg-primary text-center" ref={ref}>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="py-4">{description}</p>

        <div className="modal-action">
          {/* closes the modal */}
          <button className="btn" onClick={actionHandler}>
            Yes
          </button>
          <button className="btn" onClick={closeModal}>
            Cancle
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
