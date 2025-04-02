import React, { useEffect, useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import {
  getUser,
  updateProfile,
  updatePassword,
  uploadImage,
} from "../api/auth";
import { getToken } from "../utils/auth";
import InputMask from "react-input-mask";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { AuthContext } from "../AuthContext";
import "../index.css";

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
  const { setAvatar } = useContext(AuthContext);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imageRef = useRef(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState("/media/default-avatar.png");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("/media/default-avatar.png");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPhone, setShowPhone] = useState(true); // Добавлено состояние для чекбокса
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Обработчик изменения файла для аватара
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => setSrc(reader.result);
      reader.readAsDataURL(e.target.files[0]);
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
    } catch (error) {
      console.error("Ошибка загрузки аватара:", error);
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
      alert("Сначала выберите и обрежьте изображение!");
      return;
    }
    try {
      const blob = await getCroppedImg(imageRef.current, completedCrop, "avatar.jpg");
      setCroppedBlob(blob);
      setCroppedPreview(URL.createObjectURL(blob));
      alert("Изображение готово к загрузке!");
    } catch (error) {
      console.error("Ошибка при обрезке:", error);
      alert("Ошибка при обработке изображения");
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate("/login");
          return;
        }
        const response = await axios.put(`http://localhost:8000/api/users/update/`, profileData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsername(response.data.username);
        setEmail(response.data.email);
        setFirstName(response.data.first_name);
        setLastName(response.data.last_name);
        setMiddleName(response.data.middle_name);
        setPhone(response.data.phone);
        setShowPhone(response.data.show_phone ?? true); // Загружаем значение или true по умолчанию
        setPreview(response.data.avatar || "/media/default-avatar.png");
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
        show_phone: showPhone, // Добавляем значение чекбокса в данные
      };
      const response = await updateProfile(token, profileData);
      console.log("Ответ обновления профиля:", response);
      alert("Профиль успешно обновлён!");
    } catch (err) {
      console.error("Ошибка обновления профиля:", err);
      setError("Не удалось обновить профиль.");
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      alert("Заполните все поля для смены пароля.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      alert("Новый пароль и подтверждение не совпадают.");
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
      alert("Пароль успешно изменён!");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("Ошибка смены пароля:", err);
      alert("Не удалось изменить пароль. Проверьте правильность ввода старого пароля.");
    }
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          ✏️ Редактирование профиля
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          {/* Секция аватарки */}
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
                    <span className="text-white text-sm font-medium">Изменить</span>
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
                          const { naturalWidth: nw, naturalHeight: nh } = e.currentTarget;
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

          {/* Основная форма */}
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
            {/* Чекбокс для видимости телефона */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showPhone}
                onChange={(e) => setShowPhone(e.target.checked)}
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

          {/* Смена пароля */}
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
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
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
        </div>
      </div>
    </div>
  );
}

export default EditProfilePage;