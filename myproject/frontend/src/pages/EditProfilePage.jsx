import React, { useEffect, useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import {
  getUser,
  updateProfile,
  updatePassword,
  uploadImage,
  getSellerApplication,
  submitSellerApplication,
  deleteApplicationImage,
  getUserMedia,
  uploadUserMedia,
  deleteUserMedia,
} from "../api/auth";
import { getToken } from "../utils/auth";
import InputMask from "react-input-mask";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { AuthContext } from "../AuthContext";
import useSellerStatus from "../hooks/useSellerStatus";
import "../index.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function EditProfilePage() {
  const navigate = useNavigate();
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({
    unit: "px",
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    aspect: 1,
  });
  const { setAvatar, setUser } = useContext(AuthContext);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imageRef = useRef(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState(
    "/media/default-avatar.png"
  );
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("/media/default-avatar.png");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPhone, setShowPhone] = useState(true);
  const [bio, setBio] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // User media states
  const [userMedia, setUserMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaDescription, setMediaDescription] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // Seller application states
  const [sellerDescription, setSellerDescription] = useState("");
  const [applicationImages, setApplicationImages] = useState([]);
  const [sellerStatus, setSellerStatus] = useState("not_applied");
  const [sellerRejectReason, setSellerRejectReason] = useState("");
  const [isUploadingApplication, setIsUploadingApplication] = useState(false);
  const [selectedApplicationImages, setSelectedApplicationImages] = useState([]);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [sellerApplicationDate, setSellerApplicationDate] = useState(null);

  // Add a new state to track if a new application form should be shown after rejection
  const [showNewApplicationForm, setShowNewApplicationForm] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => setSrc(reader.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Add seller application image selection handler
  const handleApplicationImagesChange = (e) => {
    if (e.target.files) {
      setSelectedApplicationImages(Array.from(e.target.files));
    }
  };

  // Add seller application submission handler
  const handleSubmitApplication = async () => {
    if (!sellerDescription.trim()) {
      toast.error("Пожалуйста, укажите описание вашей деятельности");
      return;
    }

    if (selectedApplicationImages.length === 0 && applicationImages.length === 0) {
      toast.error("Пожалуйста, добавьте хотя бы одно изображение");
      return;
    }

    setIsUploadingApplication(true);

    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const formData = new FormData();
      formData.append("seller_description", sellerDescription);

      // Append each selected image to form data
      selectedApplicationImages.forEach((image) => {
        formData.append(`images`, image);
      });

      // For rejected applications, we need to ensure the backend knows to reset the status
      if (sellerStatus === 'rejected') {
        formData.append("is_reapplying", "true");
      }

      // Submit the application
      await submitSellerApplication(token, formData);
      
      // Refresh application data
      const response = await getSellerApplication(token);
      console.log("Обновленные данные заявки:", response.data);
      updateApplicationData(response.data);
      
      // Reset form state
      setSelectedApplicationImages([]);
      setShowNewApplicationForm(false);
      
      // Refresh the user data to update seller status in the header
      const userResponse = await getUser(token);
      if (userResponse && userResponse.data) {
        console.log("Updating user data after application submit:", userResponse.data);
        setUser(userResponse.data);
        
        // Force update localStorage to ensure persistence
        localStorage.setItem("user", JSON.stringify(userResponse.data));
      }
      
      toast.success("Заявка успешно отправлена!");
    } catch (err) {
      console.error("Ошибка отправки заявки:", err);
      toast.error("Ошибка при отправке заявки: " + (err.response?.data?.error || err.message));
    } finally {
      setIsUploadingApplication(false);
    }
  };

  // Add method to handle deleting application images
  const handleDeleteApplicationImage = async (imageId) => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      await deleteApplicationImage(token, imageId);
      
      // Remove the deleted image from the state
      setApplicationImages(applicationImages.filter(img => img.id !== imageId));
      
      toast.success("Изображение удалено");
    } catch (err) {
      console.error("Ошибка удаления изображения:", err);
      toast.error("Ошибка при удалении изображения");
    }
  };

  // Add method to update application data from API response
  const updateApplicationData = (data) => {
    setSellerDescription(data.seller_description || "");
    setApplicationImages(data.images || []);
    setSellerStatus(data.seller_status);
    setSellerRejectReason(data.seller_reject_reason || "");
    setSellerApplicationDate(data.seller_application_date);
  };

  // Handle media file selection
  const handleMediaFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedMedia(e.target.files[0]);
      // Extract filename without extension as default title
      const filename = e.target.files[0].name.split('.').slice(0, -1).join('.');
      setMediaTitle(filename);
    }
  };

  // Handle media upload
  const handleMediaUpload = async () => {
    if (!selectedMedia) {
      toast.error("Пожалуйста, выберите файл");
      return;
    }

    setIsUploadingMedia(true);

    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedMedia);
      formData.append("media_type", mediaType);
      formData.append("title", mediaTitle);
      formData.append("description", mediaDescription);

      await uploadUserMedia(token, formData);
      
      // Refresh media data
      fetchUserMedia();
      
      // Reset form
      setSelectedMedia(null);
      setMediaTitle("");
      setMediaDescription("");
      
      toast.success("Медиафайл успешно загружен!");
    } catch (err) {
      console.error("Ошибка загрузки медиафайла:", err);
      toast.error("Ошибка при загрузке медиафайла: " + (err.response?.data?.error || err.message));
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Handle media deletion
  const handleDeleteMedia = async (mediaId) => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      await deleteUserMedia(token, mediaId);
      
      // Update media list
      setUserMedia(userMedia.filter(media => media.id !== mediaId));
      
      toast.success("Медиафайл удален");
    } catch (err) {
      console.error("Ошибка удаления медиафайла:", err);
      toast.error("Ошибка при удалении медиафайла");
    }
  };

  // Fetch user media
  const fetchUserMedia = async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const mediaData = await getUserMedia(token);
      setUserMedia(mediaData);
    } catch (err) {
      console.error("Ошибка загрузки медиафайлов:", err);
    }
  };

  const handleUpload = async () => {
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("avatar", croppedBlob);
      const response = await uploadImage(token, formData);
      const newAvatarUrl = response.avatar_url + "?t=" + new Date().getTime();
      setAvatar(newAvatarUrl);
      setPreview(newAvatarUrl);
      setSrc(null);
      setCroppedBlob(null);
      setCompletedCrop(null);
      toast.success("Аватар успешно загружен!");
    } catch (error) {
      console.error("Ошибка загрузки аватара:", error);
      toast.error("Ошибка загрузки аватара");
    }
  };

  const getCroppedImg = (image, crop, fileName) => {
    const desiredWidth = 200;
    const desiredHeight = 200;
    const canvas = document.createElement("canvas");
    canvas.width = desiredWidth;
    canvas.height = desiredHeight;
    const ctx = canvas.getContext("2d");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      desiredWidth,
      desiredHeight
    );
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Не удалось создать изображение."));
        blob.name = fileName;
        resolve(blob);
      }, "image/jpeg");
    });
  };

  const handleCropConfirm = async () => {
    if (!imageRef.current || !completedCrop) {
      toast.error("Сначала выберите и обрежьте изображение!");
      return;
    }
    try {
      const blob = await getCroppedImg(
        imageRef.current,
        completedCrop,
        "avatar.jpg"
      );
      setCroppedBlob(blob);
      setCroppedPreview(URL.createObjectURL(blob));
      toast.success("Изображение готово к загрузке!");
    } catch (error) {
      console.error("Ошибка при обрезке:", error);
      toast.error("Ошибка при обработке изображения");
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getToken();
        const response = await getUser(token);
        if (!token) {
          navigate("/login");
          return;
        }
        console.log("Данные с сервера:", response.data);
        console.log("show_phone с сервера:", response.data.show_phone);
        setUsername(response.data.username);
        setEmail(response.data.email);
        setFirstName(response.data.first_name);
        setLastName(response.data.last_name);
        setMiddleName(response.data.middle_name);
        setPhone(response.data.phone);
        setShowPhone(response.data.show_phone);
        setBio(response.data.bio || "");
        setPreview(response.data.avatar || "/media/default-avatar.png");
        
        // Fetch user media
        fetchUserMedia();
        
        // Check if user has ever applied to be a seller
        if (response.data.seller_status !== 'not_applied') {
          setShowApplicationForm(true);
          
          try {
            // Fetch seller application data
            const appResponse = await getSellerApplication(token);
            console.log("Данные заявки:", appResponse.data);
            
            // If application was rejected, we might want to reset the form
            if (appResponse.data.seller_status === 'rejected') {
              // Keep the rejection reason and status, but allow for a new submission
              setSellerStatus(appResponse.data.seller_status);
              setSellerRejectReason(appResponse.data.seller_reject_reason || "");
              setSellerApplicationDate(appResponse.data.seller_application_date);
              // Don't load old description or images for rejected applications
              setSellerDescription("");
              setApplicationImages([]);
              // Make sure the new application form is hidden initially
              setShowNewApplicationForm(false);
            } else {
              // For pending or approved applications, load all data
              updateApplicationData(appResponse.data);
            }
          } catch (appErr) {
            console.error("Ошибка загрузки данных заявки:", appErr);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Ошибка загрузки данных пользователя:", err);
        setError("Не удалось загрузить данные профиля.");
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        const { width, height } = imageRef.current;
        setCrop((prev) => ({
          ...prev,
          width: Math.min(prev.width, width),
          height: Math.min(prev.height, height),
        }));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSaveProfile = async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }
      const profileData = {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone,
        show_phone: showPhone,
        bio,
      };
      console.log("Отправляемые данные:", profileData);
      await updateProfile(token, profileData);
      toast.success("Профиль успешно обновлён!");
      
      // Получаем обновленные данные пользователя с сервера
      const response = await getUser(token);
      const updatedUser = response.data;
      
      // Обновляем глобальное состояние в AuthContext
      setUser(updatedUser);
      
      // Обновляем локальные состояния
      setUsername(updatedUser.username);
      setEmail(updatedUser.email);
      setFirstName(updatedUser.first_name);
      setLastName(updatedUser.last_name);
      setMiddleName(updatedUser.middle_name);
      setPhone(updatedUser.phone);
      setShowPhone(updatedUser.show_phone);
      setBio(updatedUser.bio || "");
      setPreview(updatedUser.avatar || "/media/default-avatar.png");
    } catch (err) {
      console.error("Ошибка обновления профиля:", err);
      toast.error("Не удалось обновить профиль: " + err.message);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      toast.error("Заполните все поля для смены пароля.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Новый пароль и подтверждение не совпадают.");
      return;
    }
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }
      const response = await updatePassword(token, {
        old_password: oldPassword,
        new_password: newPassword,
      });
      console.log("Ответ смены пароля:", response);
      toast.success("Пароль успешно изменён!");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("Ошибка смены пароля:", err);
      toast.error(
        "Не удалось изменить пароль. Проверьте правильность ввода старого пароля."
      );
    }
  };

  // Add function to reset application form for new submission
  const resetApplicationForm = () => {
    // Keep the description from the previous application
    // Don't reset applicationImages to allow editing existing images
    setSellerStatus("rejected"); // Keep the status as rejected during editing
    setSelectedApplicationImages([]);
    setShowNewApplicationForm(true);
  };

  // Update the button handler for rejected applications
  const handlePrepareNewApplication = () => {
    // Get the latest application data to ensure we have the most recent images
    const fetchRejectedApplicationData = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate("/login");
          return;
        }
        
        // Fetch seller application data to get the latest images
        const appResponse = await getSellerApplication(token);
        
        // Keep existing description if available
        if (appResponse.data.seller_description) {
          setSellerDescription(appResponse.data.seller_description);
        }
        
        // Keep existing images
        if (appResponse.data.images && appResponse.data.images.length > 0) {
          setApplicationImages(appResponse.data.images);
        }
        
        setShowNewApplicationForm(true);
      } catch (err) {
        console.error("Ошибка загрузки данных заявки:", err);
        toast.error("Не удалось загрузить данные предыдущей заявки");
        // Still show the form even if we couldn't load previous data
        setShowNewApplicationForm(true);
      }
    };
    
    fetchRejectedApplicationData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          ✏️ Редактирование профиля
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-6">
              <div className="relative group cursor-pointer">
                <label className="block w-32 h-32 rounded-full overflow-hidden">
                  <img
                    src={preview}
                    alt="Avatar Preview"
                    className="w-full h-full object-cover object-center border-4 border-blue-100 dark:border-blue-900/50 shadow-lg scale-105 transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="text-white text-sm font-medium">
                      Изменить
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="avatarInput"
                  />
                </label>
              </div>
              <div className="w-full space-y-4">
                {src && (
                  <div className="space-y-4">
                    <ReactCrop
                      crop={crop}
                      onChange={(newCrop) => setCrop({ ...crop, ...newCrop })}
                      onComplete={(c) => setCompletedCrop(c)}
                      className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <img
                        ref={imageRef}
                        src={src}
                        alt="Crop source"
                        className="max-h-96 w-full object-contain"
                        onLoad={(e) => {
                          const { naturalWidth: nw, naturalHeight: nh } =
                            e.currentTarget;
                          const minSize = Math.min(nw, nh, 200);
                          setCrop({
                            unit: "px",
                            x: (nw - minSize) / 2,
                            y: (nh - minSize) / 2,
                            width: minSize,
                            height: minSize,
                            aspect: 1,
                          });
                        }}
                      />
                    </ReactCrop>
                    <div className="flex gap-4">
                      <button
                        onClick={handleCropConfirm}
                        className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all"
                      >
                        Применить обрезку
                      </button>
                    </div>
                  </div>
                )}
                {croppedBlob && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Загрузка...
                      </span>
                    ) : (
                      "Сохранить новое фото"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Имя
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Фамилия
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Отчество
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Телефон
                </label>
                <InputMask
                  mask="+7 (999) 999-99-99"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                О себе или хозяйстве
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Расскажите о себе, своем хозяйстве или продукции..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all resize-none"
              />
              
              {/* Media attachments for bio */}
              <div className="mt-3">
                <div className="flex items-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Прикрепите фото или видео к описанию
                  </p>
                  <div className="ml-auto flex items-center">
                    <select
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value)}
                      className="text-sm px-2 py-1 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <option value="image">Фото</option>
                      <option value="video">Видео</option>
                    </select>
                    <label className="ml-2 cursor-pointer px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg flex items-center">
                      <span>Выбрать файл</span>
                      <input
                        type="file"
                        accept={mediaType === "image" ? "image/*" : "video/*"}
                        onChange={handleMediaFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                {selectedMedia && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {selectedMedia.name} ({(selectedMedia.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedMedia(null)}
                          className="text-sm text-red-500 hover:text-red-600"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handleMediaUpload}
                          disabled={isUploadingMedia}
                          className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                        >
                          {isUploadingMedia ? "Загрузка..." : "Прикрепить"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          value={mediaTitle}
                          onChange={(e) => setMediaTitle(e.target.value)}
                          placeholder="Заголовок (необязательно)"
                          className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={mediaDescription}
                          onChange={(e) => setMediaDescription(e.target.value)}
                          placeholder="Описание (необязательно)"
                          className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Display existing media attachments */}
                {userMedia.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Прикрепленные файлы:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {userMedia.map((media) => (
                        <div
                          key={media.id}
                          className="group relative bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                        >
                          <div className="aspect-square">
                            {media.media_type === "image" ? (
                              <img
                                src={media.file_url}
                                alt={media.title || "Изображение"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={media.file_url}
                                className="w-full h-full object-cover"
                                controls
                              />
                            )}
                            <button
                              onClick={() => handleDeleteMedia(media.id)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                          {(media.title || media.description) && (
                            <div className="p-2">
                              {media.title && (
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                  {media.title}
                                </p>
                              )}
                              {media.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {media.description}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showPhone}
                onChange={(e) => {
                  setShowPhone(e.target.checked);
                  console.log("showPhone изменён:", e.target.checked);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Показывать телефон другим пользователям
              </label>
            </div>
            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              Сохранить изменения
            </button>
          </div>

          <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              🔒 Смена пароля
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Текущий пароль
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all pr-12"
                  />
                  <button
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 hover:text-blue-500"
                  >
                    {showOldPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all pr-12"
                  />
                  <button
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 hover:text-blue-500"
                  >
                    {showNewPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Подтвердите новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all pr-12"
                  />
                  <button
                    onClick={() =>
                      setShowConfirmNewPassword(!showConfirmNewPassword)
                    }
                    className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 hover:text-blue-500"
                  >
                    {showConfirmNewPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>
              <button
                onClick={handleChangePassword}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                Сменить пароль
              </button>
            </div>
          </div>
          
          {/* New Seller Application Section */}
          <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                🌱 Стать продавцом
              </h3>
              {!showApplicationForm && (
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white"
                >
                  Подать заявку
                </button>
              )}
            </div>
            
            {showApplicationForm && (
              <div className="space-y-6">
                {/* Status display section */}
                {sellerStatus !== 'not_applied' && (
                  <div className={`
                    p-4 rounded-lg border 
                    ${sellerStatus === 'pending' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' : ''} 
                    ${sellerStatus === 'approved' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' : ''} 
                    ${sellerStatus === 'rejected' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700' : ''}
                  `}>
                    <div className="flex items-center mb-2">
                      <span className={`
                        text-sm font-medium px-2.5 py-0.5 rounded-full mr-2
                        ${sellerStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : ''} 
                        ${sellerStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''} 
                        ${sellerStatus === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : ''}
                      `}>
                        {sellerStatus === 'pending' && 'На рассмотрении'}
                        {sellerStatus === 'approved' && 'Подтверждена'}
                        {sellerStatus === 'rejected' && 'Отклонена'}
                      </span>
                      <h4 className="text-lg font-semibold">Статус заявки</h4>
                    </div>
                    
                    {sellerStatus === 'pending' && (
                      <p className="text-yellow-700 dark:text-yellow-300">
                        Ваша заявка рассматривается администрацией. Мы свяжемся с вами при необходимости.
                      </p>
                    )}
                    
                    {sellerStatus === 'approved' && (
                      <p className="text-green-700 dark:text-green-300">
                        Поздравляем! Ваша заявка одобрена, теперь вы можете продавать товары.
                      </p>
                    )}
                    
                    {sellerStatus === 'rejected' && (
                      <div>
                        <p className="text-red-700 dark:text-red-300 mb-2">
                          Ваша заявка была отклонена.
                        </p>
                        {sellerRejectReason && (
                          <div className="mt-2">
                            <p className="font-medium text-gray-700 dark:text-gray-300">Причина отклонения:</p>
                            <p className="text-gray-600 dark:text-gray-400 border-l-4 border-red-500 pl-3 mt-1">
                              {sellerRejectReason}
                            </p>
                          </div>
                        )}
                        {!showNewApplicationForm && (
                          <button 
                            onClick={handlePrepareNewApplication}
                            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                          >
                            Отправить новую заявку
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Application History Section */}
                    {sellerStatus !== 'not_applied' && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-md font-semibold text-gray-700 dark:text-gray-300">История заявки</h5>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Заявка подана: {sellerApplicationDate ? new Date(sellerApplicationDate).toLocaleString() : 'Дата неизвестна'}
                              </p>
                            </div>
                          </div>
                          
                          {sellerStatus === 'approved' && (
                            <div className="flex items-start mt-3">
                              <div className="flex-shrink-0 mt-1">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Заявка одобрена администратором
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {sellerStatus === 'rejected' && (
                            <div className="flex items-start mt-3">
                              <div className="flex-shrink-0 mt-1">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Заявка отклонена администратором
                                </p>
                                {sellerRejectReason && (
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Причина: {sellerRejectReason}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Application form (shown if status is not 'approved' or 'pending') */}
                {(sellerStatus === 'not_applied' || (sellerStatus === 'rejected' && showNewApplicationForm)) && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Описание вашей деятельности
                      </label>
                      <textarea
                        value={sellerDescription}
                        onChange={(e) => setSellerDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                        rows={5}
                        placeholder="Опишите, что вы планируете продавать, как давно занимаетесь этим, какие товары производите, и почему покупатели должны выбрать именно вас."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Фотографии для подтверждения (фермы, производства, продукции)
                      </label>
                      <input 
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleApplicationImagesChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 transition-all"
                      />
                      
                      {/* Selected images preview */}
                      {selectedApplicationImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                          {selectedApplicationImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img 
                                src={URL.createObjectURL(image)} 
                                alt={`Выбранное изображение ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                onClick={() => {
                                  const newImages = [...selectedApplicationImages];
                                  newImages.splice(index, 1);
                                  setSelectedApplicationImages(newImages);
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Existing application images - show for both new applications and rejected applications */}
                      {applicationImages.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {sellerStatus === 'rejected' ? 'Изображения из предыдущей заявки:' : 'Загруженные изображения:'}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {applicationImages.map((image) => (
                              <div key={image.id} className="relative group">
                                <img 
                                  src={image.image_url} 
                                  alt="Загруженное изображение" 
                                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                                />
                                <button
                                  onClick={() => handleDeleteApplicationImage(image.id)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleSubmitApplication}
                      disabled={isUploadingApplication || !sellerDescription.trim() || (selectedApplicationImages.length === 0 && applicationImages.length === 0)}
                      className="w-full py-3 mt-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingApplication ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Отправка...
                        </span>
                      ) : sellerStatus === 'rejected' ? "Отправить новую заявку" : "Отправить заявку"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default EditProfilePage;