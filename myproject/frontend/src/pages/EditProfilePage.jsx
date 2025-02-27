import React, { useEffect, useState, useRef } from "react";
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

function EditProfilePage() {
  const navigate = useNavigate();

  /*** Состояния для работы с аватаркой ***/
  // Изображение для обрезки (выбранное пользователем)
  const [src, setSrc] = useState(null);
  // Настройки обрезки (начальное значение)
  const [crop, setCrop] = useState({ unit: "%", width: 80, aspect: 1 });
  // Завершённые настройки обрезки
  const [completedCrop, setCompletedCrop] = useState(null);
  // Ссылка на изображение в DOM для получения его размеров
  const imageRef = useRef(null);
  // Blob с обрезанным изображением
  const [croppedBlob, setCroppedBlob] = useState(null);
  // Превью обрезанного изображения (локальное)
  const [croppedPreview, setCroppedPreview] = useState("/default-avatar.png");
  // Флаг загрузки аватарки
  const [uploading, setUploading] = useState(false);
  // Превью аватара, полученного с сервера (при загрузке профиля)
  const [preview, setPreview] = useState("/default-avatar.png");

  /*** Состояния для данных профиля ***/
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [phone, setPhone] = useState("");

  /*** Состояния для смены пароля ***/
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  /*** Другие состояния ***/
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /*** Функции работы с аватаркой ***/

  // Обработка выбора файла (устанавливаем src для ReactCrop)
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        setSrc(reader.result);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Функция для получения обрезанного изображения в виде Blob
  const getCroppedImg = (image, crop, fileName) => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          return reject(new Error("Не удалось создать изображение."));
        }
        blob.name = fileName;
        resolve(blob);
      }, "image/jpeg");
    });
  };

  // Подтверждение обрезки: получение Blob и установка локального превью
  const handleCropConfirm = async () => {
    if (!imageRef.current || !completedCrop) {
      alert("Сначала выберите и обрежьте изображение!");
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
      alert("Изображение готово к загрузке!");
    } catch (error) {
      console.error("Ошибка при обрезке:", error);
      alert("Ошибка при обработке изображения");
    }
  };

  // Загрузка аватарки на сервер
  // Загрузка аватарки на сервер
  const handleUpload = async () => {
    if (!croppedBlob) {
      alert("Сначала выберите и обрежьте изображение!");
      return;
    }
    try {
      setUploading(true);
      const token = getToken();
      const formData = new FormData();
      formData.append("avatar", croppedBlob, "avatar.jpg");

      const response = await uploadImage(token, formData);
      if (response.avatar_url) {
        // Обновляем аватар, полученный с сервера
        setPreview(response.avatar_url);
        alert("Аватар успешно обновлён!");
        // Перезагружаем страницу, чтобы отобразить новый аватар
        window.location.reload();
      } else {
        throw new Error("Не получен URL аватара");
      }
    } catch (error) {
      console.error("Ошибка загрузки аватара:", error);
      alert("Ошибка загрузки: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  /*** Загрузка данных пользователя при монтировании компонента ***/
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await getUser(token);
        // Заполняем состояния данными с сервера
        setUsername(response.data.username);
        setEmail(response.data.email);
        setFirstName(response.data.first_name);
        setLastName(response.data.last_name);
        setMiddleName(response.data.middle_name);
        setPhone(response.data.phone);
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

  /*** Функции для редактирования профиля ***/
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
      };

      const response = await updateProfile(token, profileData);
      console.log("Ответ обновления профиля:", response);
      alert("Профиль успешно обновлён!");
    } catch (err) {
      console.error("Ошибка обновления профиля:", err);
      setError("Не удалось обновить профиль.");
    }
  };

  /*** Функция для смены пароля ***/
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
      alert(
        "Не удалось изменить пароль. Проверьте правильность ввода старого пароля."
      );
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-gray-200">
          Редактирование профиля
        </h1>
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          {/* Секция работы с аватаркой */}
          <div className="flex justify-center mb-4">
            <img
              src={preview}
              alt="Avatar Preview"
              className="w-32 h-32 rounded-full object-cover border border-gray-200"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="avatarFile"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Выберите изображение
            </label>
            <input
              id="avatarFile"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
          </div>
          {src && (
            <div className="mb-4">
              <ReactCrop
                crop={crop}
                onChange={(newCrop) => setCrop(newCrop)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                <img
                  ref={imageRef}
                  src={src}
                  alt="Crop source"
                  className="max-w-full"
                />
              </ReactCrop>
              <button
                onClick={handleCropConfirm}
                className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition"
              >
                Подтвердить обрезку
              </button>
            </div>
          )}

          {croppedBlob && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md transition mb-6"
            >
              {uploading ? "Загружается..." : "Загрузить аватар"}
            </button>
          )}

          {/* Секция редактирования профиля */}
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Имя
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Фамилия
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Отчество
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Телефон
            </label>
            <InputMask
              mask="+7 (999) 999-99-99"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <button
            onClick={handleSaveProfile}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition mb-6"
          >
            Сохранить профиль
          </button>

          {/* Секция смены пароля */}
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Сменить пароль
          </h2>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Старый пароль
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute inset-y-0 right-0 px-3 py-2"
              >
                {showOldPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Новый пароль
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 px-3 py-2"
              >
                {showNewPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Подтверждение нового пароля
            </label>
            <div className="relative">
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmNewPassword(!showConfirmNewPassword)
                }
                className="absolute inset-y-0 right-0 px-3 py-2"
              >
                {showConfirmNewPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition"
          >
            Сменить пароль
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfilePage;
